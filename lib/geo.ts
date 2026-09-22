export type Point = { lat: number; lng: number };

export function distanceMeters(a: Point, b: Point): number {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const validCoords = (lat: unknown, lng: unknown): lat is number =>
  typeof lat === "number" && typeof lng === "number" && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

// Agrupa fotos tiradas perto umas das outras (guloso: entra no primeiro grupo cujo centro está a até `radius` metros).
export function clusterByDistance<T extends Point>(points: T[], radius = 120): { center: Point; members: T[] }[] {
  const groups: { center: Point; members: T[] }[] = [];
  for (const p of points) {
    const g = groups.find((x) => distanceMeters(x.center, p) <= radius);
    if (g) {
      g.members.push(p);
      g.center = { lat: g.members.reduce((s, m) => s + m.lat, 0) / g.members.length, lng: g.members.reduce((s, m) => s + m.lng, 0) / g.members.length };
    } else groups.push({ center: { lat: p.lat, lng: p.lng }, members: [p] });
  }
  return groups;
}

export function formatDistance(m: number): string {
  if (m < 950) return `${Math.round(m / 10) * 10} m`;
  if (m < 100_000) return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0).replace(".", ",")} km`;
  return `${Math.round(m / 1000).toLocaleString("pt-BR")} km`;
}
