import { eq, isNull, or } from "drizzle-orm";
import { getDb } from "../../../../db";
import { items } from "../../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../../lib/auth";
import { PlacesNotConfigured, locateByName, placeDetails } from "../../../../lib/places";

// Completa, sob demanda, o que o Google sabe sobre lugares salvos antes destes campos existirem:
// coordenadas (para o mapa) e a introdução do lugar. Cada item é resolvido uma única vez.
export async function POST(req: Request) {
  try {
    if (!(await getPerson(req))) return unauthorized();
    if (!process.env.GOOGLE_PLACES_API_KEY) return json({ located: 0, pending: 0, code: "not_configured" });
    const db = await getDb();
    const missing = await db.select().from(items).where(or(isNull(items.lat), isNull(items.summary)));
    let located = 0;
    for (const it of missing.slice(0, 15)) {
      const fields: Record<string, unknown> = {};
      if (it.placeId) {
        const d = await placeDetails(it.placeId);
        if (d) {
          if (it.lat == null && d.lat != null) { fields.lat = d.lat; fields.lng = d.lng; }
          if (!it.summary && d.summary) fields.summary = d.summary;
          if (it.rating == null && d.rating != null) fields.rating = d.rating;
          if (!it.priceLevel && d.priceLevel) fields.priceLevel = d.priceLevel;
          if (!it.photoName && !it.imageKey && d.photoName) fields.photoName = d.photoName;
        }
      }
      if (it.lat == null && fields.lat == null) {
        const at = await locateByName(it.address || it.title, it.city);
        if (at) { fields.lat = at.lat; fields.lng = at.lng; }
      }
      if (Object.keys(fields).length === 0) continue;
      await db.update(items).set(fields).where(eq(items.id, it.id));
      located++;
    }
    return json({ located, pending: Math.max(0, missing.length - 15) });
  } catch (e) {
    if (e instanceof PlacesNotConfigured) return json({ located: 0, pending: 0, code: "not_configured" });
    return fail(e, "Não foi possível completar os dados dos lugares.");
  }
}
