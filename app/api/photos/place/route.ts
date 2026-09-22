import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { itemSeen, items, photos } from "../../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../../lib/auth";
import { validPhotoName } from "../../../../lib/places";
import { validCoords } from "../../../../lib/geo";

type PlaceIn = { placeId?: string; title?: string; address?: string; category?: string; mapUrl?: string; photoName?: string; rating?: number; priceLevel?: string; summary?: string; lat?: number; lng?: number };
const clip = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

// Confirma o lugar de um grupo de fotos: liga a um item existente ou cria o item na lista do destino.
export async function POST(req: Request) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const { photoIds, itemId, place } = (await req.json()) as { photoIds?: string[]; itemId?: string; place?: PlaceIn };
    if (!Array.isArray(photoIds) || photoIds.length === 0 || photoIds.length > 200) return json({ error: "Escolha as fotos." }, 400);
    const db = await getDb();
    const rows = await db.select().from(photos).where(inArray(photos.id, photoIds));
    if (rows.length !== photoIds.length) return json({ error: "Foto não encontrada." }, 404);
    if (rows.some((p) => p.personId !== me.id && !me.isAdmin)) return json({ error: "Só é possível organizar as suas fotos." }, 403);
    const city = rows[0].city;
    if (rows.some((p) => p.city !== city)) return json({ error: "As fotos são de destinos diferentes." }, 400);

    let target = itemId ?? null;
    if (target) {
      const [it] = await db.select({ city: items.city }).from(items).where(eq(items.id, target)).limit(1);
      if (!it || it.city !== city) return json({ error: "Esse lugar não pertence a este destino." }, 400);
    } else {
      const title = clip(place?.title, 120);
      if (!title) return json({ error: "Informe o lugar." }, 400);
      const placeId = clip(place?.placeId, 200);
      const existing = placeId ? (await db.select({ id: items.id }).from(items).where(and(eq(items.city, city), eq(items.placeId, placeId))).limit(1))[0] : undefined;
      if (existing) target = existing.id;
      else {
        target = crypto.randomUUID();
        const photoName = clip(place?.photoName, 1000), rating = Number(place?.rating);
        await db.insert(items).values({
          id: target, city, title, category: clip(place?.category, 30) ?? "Outro", address: clip(place?.address, 250),
          mapUrl: clip(place?.mapUrl, 500) ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${title} ${city}`)}`,
          placeId, note: null, rating: rating > 0 && rating <= 5 ? rating : null, priceLevel: clip(place?.priceLevel, 10), summary: clip(place?.summary, 600),
          photoName: photoName && validPhotoName(photoName) ? photoName : null, imageKey: null, lat: validCoords(place?.lat, place?.lng) ? place!.lat! : null, lng: validCoords(place?.lat, place?.lng) ? place!.lng! : null, createdBy: me.id,
        });
        await db.insert(itemSeen).values({ personId: me.id, itemId: target }).onConflictDoNothing();
      }
    }
    await db.update(photos).set({ itemId: target }).where(inArray(photos.id, photoIds));
    return json({ itemId: target });
  } catch (e) { return fail(e, "Não foi possível salvar o lugar."); }
}
