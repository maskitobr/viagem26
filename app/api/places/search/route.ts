import { fail, getPerson, json, unauthorized } from "../../../../lib/auth";
import { PlacesError, PlacesNotConfigured, searchPlaces } from "../../../../lib/places";

const cache = new Map<string, { at: number; data: unknown }>();

export async function GET(req: Request) {
  try {
    if (!(await getPerson(req))) return unauthorized();
    const u = new URL(req.url), q = u.searchParams.get("q") || "", city = u.searchParams.get("city") || "";
    const lat = Number(u.searchParams.get("lat")), lng = Number(u.searchParams.get("lng"));
    const near = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) ? { lat, lng } : undefined;
    const k = `${city}|${near ? `${near.lat.toFixed(2)},${near.lng.toFixed(2)}` : ""}|${q.trim().toLowerCase()}`, hit = cache.get(k);
    if (hit && Date.now() - hit.at < 15 * 60_000) return json(hit.data);
    const data = await searchPlaces(q, city, near);
    cache.set(k, { at: Date.now(), data });
    return json(data);
  } catch (e) {
    if (e instanceof PlacesNotConfigured) return json({ error: e.message, code: "not_configured" }, 501);
    if (e instanceof PlacesError) return json({ error: e.message }, 400);
    return fail(e, "Busca indisponível.");
  }
}
