import { isCity, type City } from "./scoring";
import { distanceMeters, validCoords } from "./geo";

export type Place = { placeId: string; title: string; address: string; category: string; rating: number | null; ratingCount: number | null; priceLevel: string | null; mapUrl: string; photoName: string | null; lat: number | null; lng: number | null; distance?: number };

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
    lat: typeof x.location?.latitude === "number" ? x.location.latitude : null,
    lng: typeof x.location?.longitude === "number" ? x.location.longitude : null,
  };
}

export async function searchPlaces(query: string, city: string, near?: { lat: number; lng: number }): Promise<Place[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new PlacesNotConfigured("A busca do Google ainda não foi configurada. Você pode adicionar o lugar manualmente.");
  if (!isCity(city) || !query.trim()) throw new PlacesError("Busca inválida.");
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.photos,places.location",
    },
    body: JSON.stringify({ textQuery: `${query.slice(0, 80)} em ${city}`, languageCode: "pt-BR", pageSize: 10, locationBias: { circle: { center: near && validCoords(near.lat, near.lng) ? { latitude: near.lat, longitude: near.lng } : centers[city], radius: near ? 15000 : 30000 } } }),
  });
  if (!r.ok) throw new PlacesError("A busca do Google falhou. Tente de novo em instantes.");
  const data = (await r.json()) as { places?: unknown[] };
  return (data.places ?? []).map(normalizePlace);
}

export const validPhotoName = (n: string) => n.length <= 1000 && /^places\/[\w-]+\/photos\/[\w-]+$/.test(n);

export async function fetchPlacePhoto(name: string) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !validPhotoName(name)) return null;
  const r = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&key=${key}`);
  return r.ok ? r : null;
}

// Lugares próximos a uma coordenada (GPS da foto), do mais perto ao mais longe.
export async function nearbyPlaces(lat: number, lng: number): Promise<Place[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new PlacesNotConfigured("A busca do Google ainda não foi configurada.");
  if (!validCoords(lat, lng)) throw new PlacesError("Localização inválida.");
  const r = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.photos,places.location",
    },
    body: JSON.stringify({ maxResultCount: 10, rankPreference: "DISTANCE", languageCode: "pt-BR", locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 250 } } }),
  });
  if (!r.ok) throw new PlacesError("Não foi possível listar os lugares próximos.");
  const data = (await r.json()) as { places?: any[] };
  return (data.places ?? []).map((x) => ({ ...normalizePlace(x), distance: x.location ? Math.round(distanceMeters({ lat, lng }, { lat: x.location.latitude, lng: x.location.longitude })) : undefined }));
}

// Coordenadas de um lugar já conhecido do Google (usado para preencher itens antigos, salvos sem localização).
export async function placeLocation(placeId: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !/^[\w-]{5,300}$/.test(placeId)) return null;
  const r = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "location" } });
  if (!r.ok) return null;
  const d = (await r.json()) as { location?: { latitude: number; longitude: number } };
  return validCoords(d.location?.latitude, d.location?.longitude) ? { lat: d.location!.latitude, lng: d.location!.longitude } : null;
}

// Último recurso: procura pelo nome dentro da cidade e usa a coordenada do primeiro resultado.
export async function locateByName(title: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const [first] = await searchPlaces(title, city);
    return first && validCoords(first.lat, first.lng) ? { lat: first.lat!, lng: first.lng! } : null;
  } catch { return null; }
}
