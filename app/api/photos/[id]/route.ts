import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { photos } from "../../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../../lib/auth";
import { deleteImage } from "../../../../lib/r2";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const { id } = await params, db = await getDb();
    const [p] = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
    if (!p) return json({ error: "Foto não encontrada." }, 404);
    if (p.personId !== me.id && !me.isAdmin) return json({ error: "Só quem enviou pode remover." }, 403);
    await db.delete(photos).where(eq(photos.id, id));
    await deleteImage(p.key).catch(() => {});
    return json({ ok: true });
  } catch (e) { return fail(e); }
}
