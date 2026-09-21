export type Choice = "quero" | "talvez" | "passo";
export type Person = { id: string; name: string; color: string };
export type Item = { id: string; placeId: string | null; city: string; title: string; category: string; address: string | null; mapUrl: string | null; note: string | null; rating: number | null; priceLevel: string | null; image: string | null; createdBy: string; createdAt: string; votes: Record<string, Choice>; isNew: boolean };
export type Photo = { id: string; personId: string; city: string; itemId: string | null; lat: number | null; lng: number | null; url: string; takenAt: string | null; createdAt: string };
export type State = { me: Person & { isAdmin: boolean }; people: Person[]; items: Item[]; photos: Photo[] };
export type PlaceResult = { placeId: string; title: string; address: string; category: string; rating: number | null; ratingCount: number | null; priceLevel: string | null; mapUrl: string; photoName: string | null; distance?: number };

export class ApiError extends Error { constructor(message: string, public status: number, public code?: string) { super(message); } }

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try { r = await fetch(url, init); } catch { throw new ApiError("Sem conexão. Verifique a internet e tente de novo.", 0); }
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(data.error || "Algo deu errado.", r.status, data.code);
  return data as T;
}

export const post = <T = any>(url: string, body?: unknown) => api<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });

// Reduz fotos do celular (lado maior 2000px, JPEG 82%) para caber rápido no upload.
export async function compress(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 600_000) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.82));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg", lastModified: file.lastModified }) : file;
  } catch { return file; }
}

export const CITIES = ["Chicago", "Dallas", "Orlando"] as const;
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
