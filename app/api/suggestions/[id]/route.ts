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

// Qualquer pessoa da família pode sugerir/alterar/limpar o dia de ir a um lugar.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const { visitDate } = (await req.json()) as { visitDate?: string | null };
    if (visitDate !== null && !validDate(visitDate)) return json({ error: "Data inválida." }, 400);
    const { id } = await params, db = await getDb();
    const r = await db.update(items).set({ visitDate }).where(eq(items.id, id)).returning({ id: items.id });
    return r.length ? json({ ok: true }) : json({ error: "Item não encontrado." }, 404);
  } catch (e) { return fail(e); }
}
