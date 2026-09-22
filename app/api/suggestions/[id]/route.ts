import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { itemSeen, itemVotes, items, photos } from "../../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../../lib/auth";
import { validDate } from "../../../../lib/dates";

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
    const body = (await req.json()) as { visitDate?: string | null; isBase?: boolean; visited?: boolean };
    const { id } = await params, db = await getDb();

    // Check-in: vale para a família toda, e qualquer um pode desfazer.
    if (typeof body.visited === "boolean") {
      const set = body.visited ? { visitedBy: me.id, visitedAt: new Date() } : { visitedBy: null, visitedAt: null };
      const r = await db.update(items).set(set).where(eq(items.id, id)).returning({ id: items.id });
      return r.length ? json({ ok: true }) : json({ error: "Item não encontrado." }, 404);
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
