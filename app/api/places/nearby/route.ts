import { fail, getPerson, json, unauthorized } from "../../../../lib/auth";
import { PlacesError, PlacesNotConfigured, nearbyPlaces } from "../../../../lib/places";

const cache = new Map<string, { at: number; data: unknown }>();

export async function GET(req: Request) {
  try {
    if (!(await getPerson(req))) return unauthorized();
    const u = new URL(req.url), lat = Number(u.searchParams.get("lat")), lng = Number(u.searchParams.get("lng"));
    const k = `${lat.toFixed(4)},${lng.toFixed(4)}`, hit = cache.get(k);
    if (hit && Date.now() - hit.at < 30 * 60_000) return json(hit.data);
    const data = await nearbyPlaces(lat, lng);
    cache.set(k, { at: Date.now(), data });
    return json(data);
  } catch (e) {
    if (e instanceof PlacesNotConfigured) return json({ error: e.message, code: "not_configured" }, 501);
    if (e instanceof PlacesError) return json({ error: e.message }, 400);
    return fail(e, "Não foi possível listar os lugares próximos.");
  }
}
