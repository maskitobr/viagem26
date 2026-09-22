import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { docs, items } from "../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../lib/auth";
import { docKey, isDocKind, validateDoc } from "../../../lib/docs";
import { putFile } from "../../../lib/r2";

// Um arquivo por chamada; o navegador envia vários em sequência, cada um com o nome do titular.
export async function POST(req: Request) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const f = await req.formData(), file = f.get("file"), itemId = f.get("itemId");
    if (!(file instanceof File)) return json({ error: "Escolha o arquivo." }, 400);
    if (typeof itemId !== "string" || !itemId) return json({ error: "Documento sem destino." }, 400);
    const db = await getDb();
    const [it] = await db.select({ id: items.id, city: items.city }).from(items).where(eq(items.id, itemId)).limit(1);
    if (!it) return json({ error: "Lugar ou voo não encontrado." }, 404);

    const { extension } = validateDoc(file);
    const key = docKey(extension), id = crypto.randomUUID();
    const holder = typeof f.get("holder") === "string" ? (f.get("holder") as string).trim().slice(0, 60) : "";
    const kindRaw = f.get("kind");
    await putFile(key, new Uint8Array(await file.arrayBuffer()), file.type);
    await db.insert(docs).values({
      id, personId: me.id, itemId, city: it.city, holder: holder || null,
      kind: isDocKind(kindRaw) ? kindRaw : "outro", key,
      filename: (file.name || "documento").slice(0, 120), contentType: file.type, size: file.size,
    });
    return json({ id, url: `/api/docs/${id}` }, 201);
  } catch (e) {
    if (e instanceof Error && (e.message.startsWith("Envie um PDF") || e.message.startsWith("O arquivo"))) return json({ error: e.message }, 400);
    return fail(e, "Não foi possível enviar o documento.");
  }
}
