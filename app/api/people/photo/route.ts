import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { people } from "../../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../../lib/auth";
import { objectKey, validateImage } from "../../../../lib/media";
import { deleteImage, putImage } from "../../../../lib/r2";

// Foto de perfil já recortada pelo cliente. A pessoa troca a própria; o admin troca a de qualquer um.
export async function POST(req: Request) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const f = await req.formData(), file = f.get("file"), target = (f.get("personId") as string) || me.id;
    if (!(file instanceof File)) return json({ error: "Escolha uma foto." }, 400);
    if (target !== me.id && !me.isAdmin) return json({ error: "Só o organizador troca a foto de outra pessoa." }, 403);
    const { extension } = validateImage(file), db = await getDb();
    const [p] = await db.select().from(people).where(eq(people.id, target)).limit(1);
    if (!p) return json({ error: "Pessoa não encontrada." }, 404);
    const key = objectKey("profiles", extension);
    await putImage(key, new Uint8Array(await file.arrayBuffer()), file.type);
    await db.update(people).set({ photoKey: key }).where(eq(people.id, target));
    if (p.photoKey) await deleteImage(p.photoKey).catch(() => {});
    return json({ url: `/api/file/${key}` });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Envie uma imagem")) return json({ error: e.message }, 400);
    return fail(e, "Não foi possível salvar a foto de perfil.");
  }
}

export async function DELETE(req: Request) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const target = new URL(req.url).searchParams.get("personId") || me.id;
    if (target !== me.id && !me.isAdmin) return json({ error: "Sem permissão." }, 403);
    const db = await getDb(), [p] = await db.select().from(people).where(eq(people.id, target)).limit(1);
    if (p?.photoKey) { await db.update(people).set({ photoKey: null }).where(eq(people.id, target)); await deleteImage(p.photoKey).catch(() => {}); }
    return json({ ok: true });
  } catch (e) { return fail(e); }
}
