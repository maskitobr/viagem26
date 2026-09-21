import { isCity, type City } from "./scoring";

export type Place = { placeId: string; title: string; address: string; category: string; rating: number | null; ratingCount: number | null; priceLevel: string | null; mapUrl: string; photoName: string | null };

const centers: Record<City, { latitude: number; longitude: number }> = {
  Chicago: { latitude: 41.8781, longitude: -87.6298 },
  Dallas: { latitude: 32.7767, longitude: -96.797 },
  Orlando: { latitude: 28.5383, longitude: -81.3792 },
};
const prices: Record<string, string> = { PRICE_LEVEL_FREE: "Grátis", PRICE_LEVEL_INEXPENSIVE: "$", PRICE_LEVEL_MODERATE: "$$", PRICE_LEVEL_EXPENSIVE: "$$$", PRICE_LEVEL_VERY_EXPENSIVE: "$$$$" };

export class PlacesNotConfigured extends Error {}
export class PlacesError extends Error {}

export function normalizePlace(x: any): Place {
  return {
    placeId: String(x.id),
    title: x.displayName?.text || "Lugar",
    address: x.formattedAddress || "",
    category: x.primaryTypeDisplayName?.text || "Lugar",
    rating: typeof x.rating === "number" ? x.rating : null,
    ratingCount: typeof x.userRatingCount === "number" ? x.userRatingCount : null,
    priceLevel: prices[x.priceLevel] ?? null,
    mapUrl: x.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${x.id}`,
    photoName: x.photos?.[0]?.name ?? null,
  };
}

export async function searchPlaces(query: string, city: string): Promise<Place[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new PlacesNotConfigured("A busca do Google ainda não foi configurada. Você pode adicionar o lugar manualmente.");
  if (!isCity(city) || !query.trim()) throw new PlacesError("Busca inválida.");
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.photos",
    },
    body: JSON.stringify({ textQuery: `${query.slice(0, 80)} em ${city}`, languageCode: "pt-BR", pageSize: 10, locationBias: { circle: { center: centers[city], radius: 30000 } } }),
  });
  if (!r.ok) throw new PlacesError("A busca do Google falhou. Tente de novo em instantes.");
  const data = (await r.json()) as { places?: unknown[] };
  return (data.places ?? []).map(normalizePlace);
}

export const validPhotoName = (n: string) => /^places\/[\w-]+\/photos\/[\w-]+$/.test(n);

export async function fetchPlacePhoto(name: string) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !validPhotoName(name)) return null;
  const r = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&key=${key}`);
  return r.ok ? r : null;
}
