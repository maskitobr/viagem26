import { fail, getPerson, json, unauthorized } from "../../../../lib/auth";
import { FlightError, FlightsNotConfigured, lookupFlight } from "../../../../lib/flights";

const cache = new Map<string, { at: number; data: unknown }>();

export async function GET(req: Request) {
  try {
    if (!(await getPerson(req))) return unauthorized();
    const u = new URL(req.url), number = u.searchParams.get("number") || "", date = u.searchParams.get("date") || "";
    const k = `${number.toUpperCase()}|${date}`, hit = cache.get(k);
    if (hit && Date.now() - hit.at < 6 * 60 * 60_000) return json(hit.data);
    const data = await lookupFlight(number, date);
    cache.set(k, { at: Date.now(), data });
    return json(data);
  } catch (e) {
    if (e instanceof FlightsNotConfigured) return json({ error: e.message, code: "not_configured" }, 501);
    if (e instanceof FlightError) return json({ error: e.message }, 400);
    return fail(e, "Busca de voos indisponível.");
  }
}
