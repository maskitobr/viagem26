import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { itemSeen, itemVotes, items, people, photos } from "../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../lib/auth";
import { isNewFor } from "../../../lib/scoring";

const photoUrl = (k: string | null) => (k ? `/api/file/${k}` : null);
export const dynamic = "force-dynamic";

const imageOf = (i: { photoName: string | null; imageKey: string | null }) =>
  i.imageKey ? `/api/file/${i.imageKey}` : i.photoName ? `/api/places/photo?name=${encodeURIComponent(i.photoName)}` : null;

export async function GET(req: Request) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const db = await getDb();
    const [ppl, its, vts, seenRows, phs] = await Promise.all([
      db.select().from(people), db.select().from(items), db.select().from(itemVotes),
      db.select().from(itemSeen).where(eq(itemSeen.personId, me.id)), db.select().from(photos),
    ]);
    const seen = new Set(seenRows.map((s) => s.itemId));
    const votesBy: Record<string, Record<string, string>> = {};
    for (const v of vts) (votesBy[v.itemId] ??= {})[v.personId] = v.choice;
    return json({
      me: { id: me.id, name: me.name, color: me.color, isAdmin: me.isAdmin, photo: photoUrl(me.photoKey) },
      people: ppl.map((p) => ({ id: p.id, name: p.name, color: p.color, photo: photoUrl(p.photoKey) })),
      items: its.map((i) => ({
        id: i.id, placeId: i.placeId, visitDate: i.visitDate, lat: i.lat, lng: i.lng, isBase: i.isBase, visitedBy: i.visitedBy, visitedAt: i.visitedAt?.toISOString() ?? null, city: i.city, title: i.title, category: i.category, address: i.address, mapUrl: i.mapUrl, note: i.note,
        rating: i.rating, priceLevel: i.priceLevel, summary: i.summary, image: imageOf(i), hasOwnImage: !!i.imageKey, createdBy: i.createdBy, createdAt: i.createdAt.toISOString(),
        votes: votesBy[i.id] ?? {}, isNew: isNewFor(i, me.id, seen),
      })),
      photos: phs.map((p) => ({ id: p.id, personId: p.personId, city: p.city, itemId: p.itemId, lat: p.lat, lng: p.lng, url: `/api/file/${p.key}`, takenAt: p.takenAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString() })),
    }, 200, { "Cache-Control": "no-store" });
  } catch (e) { return fail(e, "Não foi possível carregar os dados."); }
}
