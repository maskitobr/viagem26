import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { itemSeen, items } from "../../../db/schema";
import { fail, getPerson, json, unauthorized } from "../../../lib/auth";
import { validDate } from "../../../lib/dates";
import { airportTitle, cityOfAirport, flightTitle, type Airport, type FlightInfo } from "../../../lib/flights";

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

function cleanAirport(a: unknown): Airport | null {
  const x = a as Partial<Airport> | undefined;
  const code = text(x?.code, 4)?.toUpperCase();
  if (!code || !/^[A-Z]{3,4}$/.test(code)) return null;
  const lat = typeof x?.lat === "number" ? x.lat : null, lng = typeof x?.lng === "number" ? x.lng : null;
  return { code, name: text(x?.name, 80) ?? "", city: text(x?.city, 60) ?? "", lat, lng, timeZone: text(x?.timeZone, 60) };
}

// Cria (ou reaproveita) o lugar do aeroporto, para que ele também tenha álbum de fotos.
async function ensureAirport(db: Awaited<ReturnType<typeof getDb>>, a: Airport, personId: string) {
  const placeId = `iata:${a.code}`;
  const [found] = await db.select({ id: items.id }).from(items).where(eq(items.placeId, placeId)).limit(1);
  if (found) return found.id;
  const id = crypto.randomUUID();
  await db.insert(items).values({
    id, kind: "airport", city: cityOfAirport(a), title: airportTitle(a), category: "Aeroporto",
    address: a.name || null, placeId, lat: a.lat, lng: a.lng,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.code} airport ${a.city}`)}`,
    createdBy: personId,
  });
  return id;
}

export async function POST(req: Request) {
  try {
    const me = await getPerson(req);
    if (!me) return unauthorized();
    const b = (await req.json()) as Partial<FlightInfo>;
    const from = cleanAirport(b.from), to = cleanAirport(b.to);
    const number = text(b.number, 12)?.toUpperCase();
    if (!number) return json({ error: "Informe o número do voo." }, 400);
    if (!from || !to) return json({ error: "Informe os códigos de origem e destino (ex.: GRU e ORD)." }, 400);
    if (!validDate(b.departDate)) return json({ error: "Informe a data da partida." }, 400);
    const time = (v: unknown) => (typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : null);
    const departTime = time(b.departTime), arriveTime = time(b.arriveTime);
    if (!departTime || !arriveTime) return json({ error: "Informe os horários de partida e chegada (HH:MM)." }, 400);

    const flight: FlightInfo = {
      source: b.source === "aerodatabox" ? "aerodatabox" : null,
      number, airline: text(b.airline, 60), aircraft: text(b.aircraft, 60), from, to,
      departDate: b.departDate!, departTime, departIso: text(b.departIso, 40), terminalFrom: text(b.terminalFrom, 10),
      arriveDate: validDate(b.arriveDate) ? b.arriveDate! : b.departDate!, arriveTime, arriveIso: text(b.arriveIso, 40), terminalTo: text(b.terminalTo, 10),
    };

    const db = await getDb();
    const [dup] = await db.select({ id: items.id }).from(items)
      .where(and(eq(items.kind, "flight"), eq(items.placeId, `flight:${number}:${flight.departDate}`))).limit(1);
    if (dup) return json({ error: "Esse voo já está na lista." }, 409);

    await ensureAirport(db, from, me.id);
    await ensureAirport(db, to, me.id);

    const id = crypto.randomUUID();
    await db.insert(items).values({
      id, kind: "flight", city: "Voos", title: flightTitle(flight), category: "Voo",
      address: `${from.city || from.code} → ${to.city || to.code}`, placeId: `flight:${number}:${flight.departDate}`,
      lat: from.lat, lng: from.lng, visitDate: flight.departDate, flight, createdBy: me.id,
    });
    await db.insert(itemSeen).values({ personId: me.id, itemId: id }).onConflictDoNothing();
    return json({ id }, 201);
  } catch (e) { return fail(e, "Não foi possível salvar o voo."); }
}
