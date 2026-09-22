import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { itemSeen, itemVotes, items, photos } from "../../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../../lib/auth";
import { validDate } from "../../../../lib/dates";
import { objectKey, validateImage } from "../../../../lib/media";
import { deleteImage, putImage } from "../../../../lib/r2";
import { locateByName } from "../../../../lib/places";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const { id } = await params, db = await getDb();
    const [it] = await db.select().from(items).where(eq(items.id, id)).limit(1);
    if (!it) return json({ error: "Item não encontrado." }, 404);
    if (it.createdBy !== me.id && !me.isAdmin) return json({ error: "Só quem adicionou pode remover." }, 403);
    await db.delete(itemVotes).where(eq(itemVotes.itemId, id));
    await db.delete(itemSeen).where(eq(itemSeen.itemId, id));
    await db.update(photos).set({ itemId: null }).where(eq(photos.itemId, id));
    await db.delete(items).where(eq(items.id, id));
    return json({ ok: true });
  } catch (e) { return fail(e); }
}

// Dia de ir e check-in: qualquer pessoa. Ponto fixo (hotel/casa) do destino: só o organizador.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const body = (await req.json()) as { visitDate?: string | null; isBase?: boolean; visited?: boolean; today?: string };
    const { id } = await params, db = await getDb();

    // Check-in: vale para a família toda, e qualquer um pode desfazer.
    if (typeof body.visited === "boolean") {
      const [it] = await db.select().from(items).where(eq(items.id, id)).limit(1);
      if (!it) return json({ error: "Item não encontrado." }, 404);
      // Sem dia marcado, o check-in vira a data da visita (dia local de quem marcou).
      const day = body.visited && !it.visitDate && validDate(body.today) ? body.today : it.visitDate;
      await db.update(items).set(body.visited ? { visitedBy: me.id, visitedAt: new Date(), visitDate: day } : { visitedBy: null, visitedAt: null }).where(eq(items.id, id));
      return json({ ok: true, visitDate: body.visited ? day : it.visitDate });
    }

    if (typeof body.isBase === "boolean") {
      if (!me.isAdmin) return json({ error: "Só o organizador define onde ficaremos hospedados." }, 403);
      const [it] = await db.select().from(items).where(eq(items.id, id)).limit(1);
      if (!it) return json({ error: "Item não encontrado." }, 404);
      // Um único ponto fixo por destino.
      await db.update(items).set({ isBase: false }).where(eq(items.city, it.city));
      if (body.isBase) await db.update(items).set({ isBase: true }).where(eq(items.id, id));
      return json({ ok: true });
    }

    const visitDate = body.visitDate ?? null;
    if (visitDate !== null && !validDate(visitDate)) return json({ error: "Data inválida." }, 400);
    const r = await db.update(items).set({ visitDate }).where(eq(items.id, id)).returning({ id: items.id });
    return r.length ? json({ ok: true }) : json({ error: "Item não encontrado." }, 404);
  } catch (e) { return fail(e); }
}

// Edição de um lugar: quem adicionou ou o organizador. Se o endereço mudar em um lugar manual,
// as coordenadas são procuradas de novo para o mapa continuar certo.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const { id } = await params, db = await getDb();
    const [it] = await db.select().from(items).where(eq(items.id, id)).limit(1);
    if (!it) return json({ error: "Item não encontrado." }, 404);
    if (it.createdBy !== me.id && !me.isAdmin) return json({ error: "Só quem adicionou pode editar." }, 403);

    const f = await req.formData();
    const text = (k: string, max: number) => { const v = f.get(k); return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null; };
    const title = text("title", 120);
    if (!title) return json({ error: "O nome do lugar não pode ficar vazio." }, 400);
    const address = text("address", 250), note = text("note", 500), category = text("category", 30) ?? it.category;

    const patchFields: Record<string, unknown> = { title, address, note, category };
    const file = f.get("image");
    if (file instanceof File && file.size > 0) {
      const { extension } = validateImage(file);
      const key = objectKey("items", extension);
      await putImage(key, new Uint8Array(await file.arrayBuffer()), file.type);
      patchFields.imageKey = key;
      if (it.imageKey) await deleteImage(it.imageKey).catch(() => {});
    }
    if (f.get("removeImage") === "1" && it.imageKey) {
      patchFields.imageKey = null;
      await deleteImage(it.imageKey).catch(() => {});
    }
    if (!it.placeId && address && address !== it.address) {
      const at = await locateByName(address, it.city);
      if (at) { patchFields.lat = at.lat; patchFields.lng = at.lng; }
    }
    if (!it.placeId) patchFields.mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address ?? title}, ${it.city}`)}`;

    await db.update(items).set(patchFields).where(eq(items.id, id));
    return json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Envie uma imagem")) return json({ error: e.message }, 400);
    return fail(e, "Não foi possível salvar as alterações.");
  }
}
