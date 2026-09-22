import type { FlightInfo } from "./flights";

export type Choice = "quero" | "talvez" | "passo";
export type Person = { id: string; name: string; color: string; photo?: string | null };
export type Item = { id: string; kind: "place" | "flight" | "airport"; flight: FlightInfo | null; placeId: string | null; visitDate: string | null; lat: number | null; lng: number | null; isBase: boolean; visitedBy: string | null; visitedAt: string | null; city: string; title: string; category: string; address: string | null; mapUrl: string | null; note: string | null; rating: number | null; priceLevel: string | null; summary: string | null; image: string | null; hasOwnImage: boolean; createdBy: string; createdAt: string; votes: Record<string, Choice>; isNew: boolean };
export type Photo = { id: string; personId: string; city: string; itemId: string | null; lat: number | null; lng: number | null; url: string; takenAt: string | null; createdAt: string };
export type State = { me: Person & { isAdmin: boolean }; people: Person[]; items: Item[]; photos: Photo[] };
export type PlaceResult = { placeId: string; title: string; address: string; category: string; rating: number | null; ratingCount: number | null; priceLevel: string | null; mapUrl: string; photoName: string | null; summary: string | null; lat: number | null; lng: number | null; distance?: number };

export class ApiError extends Error { constructor(message: string, public status: number, public code?: string) { super(message); } }

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try { r = await fetch(url, init); } catch { throw new ApiError("Sem conexão. Verifique a internet e tente de novo.", 0); }
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(data.error || "Algo deu errado.", r.status, data.code);
  return data as T;
}

export const patch = <T = any>(url: string, body: unknown) => api<T>(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const post = <T = any>(url: string, body?: unknown) => api<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });

const SERVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Reduz fotos do celular (lado maior 2000px, JPEG 82%) e converte formatos que o servidor não aceita,
// como o HEIC do iPhone. Só desiste quando o navegador não consegue abrir a imagem.
export async function compress(file: File): Promise<File> {
  const supported = SERVER_TYPES.includes(file.type);
  if (supported && file.size < 600_000) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.82));
    if (!blob) throw new Error("conversão falhou");
    const out = new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg", lastModified: file.lastModified });
    return supported && out.size >= file.size ? file : out;
  } catch {
    if (supported) return file;
    throw new Error("Não consegui ler essa imagem. Tente enviar como JPG ou PNG.");
  }
}

// Envia várias fotos em sequência; devolve quantas foram e os erros de cada arquivo.
export async function uploadPhotos(files: File[], to: { city: string; itemId?: string | null }, onStep?: (done: number, total: number) => void) {
  const errors: string[] = [];
  let sent = 0;
  for (let i = 0; i < files.length; i++) {
    try {
      const f = new FormData(), small = await compress(files[i]);
      const meta = await readExif(files[i]);
      f.set("file", small); f.set("city", to.city); f.set("takenAt", String(meta.takenAt));
      if (to.itemId) f.set("itemId", to.itemId);
      if (meta.lat != null && meta.lng != null) { f.set("lat", String(meta.lat)); f.set("lng", String(meta.lng)); }
      await api("/api/photos", { method: "POST", body: f });
      sent++;
    } catch (e) { errors.push(`${files[i].name}: ${(e as Error).message}`); }
    onStep?.(i + 1, files.length);
  }
  return { sent, errors };
}

export const CITIES = ["Chicago", "Dallas", "Orlando", "Voos"] as const;
export const CATEGORIES = ["Restaurante", "Passeio", "Parque", "Compras", "Museu", "Outro"];
export const CHOICE_LABEL: Record<Choice, string> = { quero: "Quero muito", talvez: "Talvez", passo: "Passo" };
export const SCORE: Record<Choice, number> = { quero: 2, talvez: 1, passo: 0 };
export const score = (v: Record<string, Choice>) => Object.values(v).reduce((s, c) => s + SCORE[c], 0);

// Lê GPS e data original do EXIF. Deve rodar ANTES de comprimir (o canvas descarta o EXIF).
export async function readExif(file: File): Promise<{ lat: number | null; lng: number | null; takenAt: number }> {
  let lat: number | null = null, lng: number | null = null, takenAt = file.lastModified;
  try {
    const ex = await import("exifr/dist/lite.esm.mjs");
    const g = await ex.gps(file);
    if (g && Number.isFinite(g.latitude) && Number.isFinite(g.longitude)) { lat = g.latitude; lng = g.longitude; }
    const d = (await ex.parse(file, { pick: ["DateTimeOriginal"] }))?.DateTimeOriginal;
    if (d instanceof Date && !Number.isNaN(d.getTime())) takenAt = d.getTime();
  } catch { /* sem EXIF: segue sem localização */ }
  return { lat, lng, takenAt };
}

export type TravelMode = "walking" | "transit" | "driving";

// Perto dá para ir a pé. Em Chicago o padrão é metrô/trem; em Dallas e Orlando, carro.
// O Google Maps abre com esse modo e deixa trocar para a pé, transporte ou carro.
export function travelMode(city: string, meters: number | null): TravelMode {
  if (meters != null && meters <= 2500) return "walking";
  return city === "Chicago" ? "transit" : "driving";
}

export function directionsUrl(from: { lat: number; lng: number } | null, to: Item, mode: TravelMode): string {
  const u = new URL("https://www.google.com/maps/dir/");
  u.searchParams.set("api", "1");
  if (from) u.searchParams.set("origin", `${from.lat},${from.lng}`);
  if (to.placeId) { u.searchParams.set("destination", `${to.title}, ${to.city}`); u.searchParams.set("destination_place_id", to.placeId); }
  else u.searchParams.set("destination", to.lat != null && to.lng != null ? `${to.lat},${to.lng}` : `${to.title}, ${to.city}`);
  u.searchParams.set("travelmode", mode);
  return u.toString();
}

export const CITY_CENTER: Record<string, { lat: number; lng: number }> = {
  Chicago: { lat: 41.8781, lng: -87.6298 },
  Dallas: { lat: 32.7767, lng: -96.797 },
  Orlando: { lat: 28.5383, lng: -81.3792 },
};
