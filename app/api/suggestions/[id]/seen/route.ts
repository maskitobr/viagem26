import { getDb } from "../../../../../db";
import { itemSeen } from "../../../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../../../lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    await (await getDb()).insert(itemSeen).values({ personId: me.id, itemId: (await params).id }).onConflictDoNothing();
    return json({ ok: true });
  } catch (e) { return fail(e); }
}
