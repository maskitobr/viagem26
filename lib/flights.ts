import { CITY_CENTER } from "./client";
import { distanceMeters } from "./geo";

export type Airport = { code: string; name: string; city: string; lat: number | null; lng: number | null; timeZone: string | null };
export type FlightInfo = {
  source?: "aerodatabox" | null;
  number: string;
  airline: string | null;
  aircraft: string | null;
  from: Airport;
  to: Airport;
  departDate: string; departTime: string; departIso: string | null; terminalFrom: string | null;
  arriveDate: string; arriveTime: string; arriveIso: string | null; terminalTo: string | null;
};

export class FlightsNotConfigured extends Error {}
export class FlightError extends Error {}

export const normalizeNumber = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "");

// "2026-11-19 22:05-03:00" (formato do AeroDataBox) -> data, hora e instante exato.
export function parseFlightTime(raw: unknown): { date: string; time: string; iso: string | null } | null {
  if (typeof raw !== "string") return null;
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?\s*(Z|[+-]\d{2}:?\d{2})?$/);
  if (!m) return null;
  const [, date, time, zone] = m;
  const offset = zone === "Z" ? "Z" : zone ? (zone.includes(":") ? zone : `${zone.slice(0, 3)}:${zone.slice(3)}`) : null;
  const d = offset ? new Date(`${date}T${time}:00${offset}`) : null;
  return { date, time, iso: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null };
}

function airportOf(x: any): Airport {
  const a = x?.airport ?? {};
  const lat = a.location?.lat, lng = a.location?.lon;
  return {
    code: String(a.iata || a.icao || "").toUpperCase(),
    name: a.shortName || a.name || "",
    city: a.municipalityName || "",
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
    timeZone: a.timeZone ?? null,
  };
}

export function normalizeFlight(x: any): FlightInfo | null {
  const dep = parseFlightTime(x?.departure?.scheduledTime?.local) ?? parseFlightTime(x?.departure?.revisedTime?.local);
  const arr = parseFlightTime(x?.arrival?.scheduledTime?.local) ?? parseFlightTime(x?.arrival?.revisedTime?.local);
  const from = airportOf(x?.departure), to = airportOf(x?.arrival);
  if (!dep || !arr || !from.code || !to.code) return null;
  return {
    source: "aerodatabox",
    number: String(x?.number || "").replace(/\s+/g, " ").trim(),
    airline: x?.airline?.name ?? null,
    aircraft: x?.aircraft?.model ?? null,
    from, to,
    departDate: dep.date, departTime: dep.time, departIso: dep.iso, terminalFrom: x?.departure?.terminal ?? null,
    arriveDate: arr.date, arriveTime: arr.time, arriveIso: arr.iso, terminalTo: x?.arrival?.terminal ?? null,
  };
}

// Busca o voo pelo número e data de partida. Chave gratuita do RapidAPI; sem ela, o cadastro manual continua valendo.
export async function lookupFlight(number: string, date: string): Promise<FlightInfo[]> {
  const key = process.env.AERODATABOX_API_KEY;
  if (!key) throw new FlightsNotConfigured("A busca automática de voos ainda não foi configurada. Preencha os dados do voo à mão.");
  const n = normalizeNumber(number);
  if (!/^[A-Z0-9]{2,3}\d{1,4}$/.test(n)) throw new FlightError("Número de voo inválido. Exemplo: LA8180.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new FlightError("Data inválida.");
  const r = await fetch(`https://aerodatabox.p.rapidapi.com/flights/number/${n}/${date}?withAircraftImage=false&withLocation=true`, {
    headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com" },
  });
  if (r.status === 404) throw new FlightError("Não encontrei esse voo nessa data. Confira o número e o dia da partida.");
  if (r.status === 429) throw new FlightError("A cota de buscas do mês acabou. Preencha os dados à mão.");
  if (!r.ok) throw new FlightError("A busca de voos falhou. Tente de novo ou preencha à mão.");
  const data = (await r.json()) as unknown;
  const list = Array.isArray(data) ? data : [data];
  return list.map(normalizeFlight).filter((f): f is FlightInfo => !!f);
}

// Aeroporto perto de um destino entra na aba daquela cidade; os demais ficam em "Voos".
export function cityOfAirport(a: Airport): string {
  if (a.lat == null || a.lng == null) return "Voos";
  for (const [city, center] of Object.entries(CITY_CENTER)) {
    if (distanceMeters({ lat: a.lat, lng: a.lng }, center) < 120_000) return city;
  }
  return "Voos";
}

export const airportTitle = (a: Airport) => `Aeroporto ${a.code}${a.city ? ` · ${a.city}` : a.name ? ` · ${a.name}` : ""}`;
export const flightTitle = (f: FlightInfo) => `${f.from.code} → ${f.to.code} · ${f.number}`;

export function flightMinutes(f: FlightInfo): number | null {
  if (!f.departIso || !f.arriveIso) return null;
  const m = Math.round((new Date(f.arriveIso).getTime() - new Date(f.departIso).getTime()) / 60000);
  return m > 0 && m < 60 * 30 ? m : null;
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return h === 0 ? `${m}min` : m === 0 ? `${h}h` : `${h}h ${m}min`;
}
