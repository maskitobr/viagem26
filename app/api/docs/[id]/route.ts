import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { docs } from "../../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../../lib/auth";
import { deleteFile, getFile } from "../../../../lib/r2";

// Documentos são privados: só quem enviou abre ou remove.
async function mine(req: Request, id: string) {
  const me = await getPerson(req);
  if (!me) return { error: unauthorized() } as const;
  const db = await getDb();
  const [d] = await db.select().from(docs).where(eq(docs.id, id)).limit(1);
  if (!d) return { error: json({ error: "Documento não encontrado." }, 404) } as const;
  if (d.personId !== me.id) return { error: json({ error: "Este documento é de outra pessoa." }, 403) } as const;
  return { doc: d, db } as const;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const r = await mine(req, (await params).id);
    if ("error" in r) return r.error;
    const o = await getFile(r.doc.key);
    return new Response(o.Body as ReadableStream, {
      headers: {
        "Content-Type": r.doc.contentType || "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(r.doc.filename)}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) { return fail(e, "Não foi possível abrir o documento."); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const r = await mine(req, (await params).id);
    if ("error" in r) return r.error;
    await r.db.delete(docs).where(eq(docs.id, r.doc.id));
    await deleteFile(r.doc.key).catch(() => {});
    return json({ ok: true });
  } catch (e) { return fail(e, "Não foi possível remover o documento."); }
}
