import { getImage, validKey } from "../../../../lib/r2";

export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!validKey(key)) return new Response("Não encontrado", { status: 404 });
  try {
    const o = await getImage(key);
    return new Response(o.Body as ReadableStream, { headers: { "Content-Type": o.ContentType || "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch { return new Response("Não encontrado", { status: 404 }); }
}
