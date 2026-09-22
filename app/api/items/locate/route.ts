import { eq, isNull } from "drizzle-orm";
import { getDb } from "../../../../db";
import { items } from "../../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../../lib/auth";
import { PlacesNotConfigured, locateByName, placeLocation } from "../../../../lib/places";

// Preenche, sob demanda, as coordenadas dos itens salvos antes do mapa existir. Cada item é resolvido uma única vez.
export async function POST(req: Request) {
  try {
    if (!(await getPerson(req))) return unauthorized();
    if (!process.env.GOOGLE_PLACES_API_KEY) return json({ located: 0, pending: 0, code: "not_configured" });
    const db = await getDb();
    const missing = await db.select().from(items).where(isNull(items.lat));
    let located = 0;
    for (const it of missing.slice(0, 15)) {
      const at = (it.placeId ? await placeLocation(it.placeId) : null) ?? (await locateByName(it.title, it.city));
      if (!at) continue;
      await db.update(items).set({ lat: at.lat, lng: at.lng }).where(eq(items.id, it.id));
      located++;
    }
    return json({ located, pending: Math.max(0, missing.length - 15) });
  } catch (e) {
    if (e instanceof PlacesNotConfigured) return json({ located: 0, pending: 0, code: "not_configured" });
    return fail(e, "Não foi possível localizar os lugares.");
  }
}
