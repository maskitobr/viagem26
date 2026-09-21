import { fetchPlacePhoto } from "../../../../lib/places";

export async function GET(req: Request) {
  const r = await fetchPlacePhoto(new URL(req.url).searchParams.get("name") || "");
  if (!r) return new Response("Não encontrado", { status: 404 });
  return new Response(r.body, { headers: { "Content-Type": r.headers.get("content-type") || "image/jpeg", "Cache-Control": "public, max-age=86400" } });
}
