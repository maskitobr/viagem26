import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { itemSeen, itemVotes, items } from "../../../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../../../lib/auth";
import { isChoice } from "../../../../../lib/scoring";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const { id } = await params, { choice } = (await req.json()) as { choice: unknown };
    if (choice !== null && !isChoice(choice)) return json({ error: "Voto inválido." }, 400);
    const db = await getDb();
    const [it] = await db.select({ id: items.id }).from(items).where(eq(items.id, id)).limit(1);
    if (!it) return json({ error: "Item não encontrado." }, 404);
    if (choice === null) await db.delete(itemVotes).where(and(eq(itemVotes.personId, me.id), eq(itemVotes.itemId, id)));
    else await db.insert(itemVotes).values({ personId: me.id, itemId: id, choice }).onConflictDoUpdate({ target: [itemVotes.personId, itemVotes.itemId], set: { choice } });
    await db.insert(itemSeen).values({ personId: me.id, itemId: id }).onConflictDoNothing();
    return json({ ok: true });
  } catch (e) { return fail(e, "Não foi possível registrar o voto."); }
}
