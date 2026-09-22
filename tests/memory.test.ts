import { describe, expect, it } from "vitest";
import { buildDays } from "../components/viagem/memory";
import type { Item, Photo, State } from "../lib/client";

const item = (o: Partial<Item>): Item => ({ id: "x", placeId: null, visitDate: null, lat: null, lng: null, isBase: false, visitedBy: null, visitedAt: null, city: "Chicago", title: "Lugar", category: "Passeio", address: null, mapUrl: null, note: null, rating: null, priceLevel: null, summary: null, image: null, hasOwnImage: false, createdBy: "p1", createdAt: "2026-11-01T00:00:00Z", votes: {}, isNew: false, ...o });
const photo = (o: Partial<Photo>): Photo => ({ id: "f", personId: "p1", city: "Chicago", itemId: null, lat: null, lng: null, url: "/f", takenAt: null, createdAt: "2026-11-21T20:00:00Z", ...o });
const state = (items: Item[], photos: Photo[] = []): State => ({ me: { id: "p1", name: "Bruno", color: "#000", isAdmin: true }, people: [], items, photos });

describe("memória da viagem", () => {
  it("agrupa pelo dia do destino, não pelo fuso de quem lê", () => {
    // 22:30 em Chicago ainda é dia 21, mesmo já sendo dia 22 no Brasil.
    const d = buildDays(state([item({ id: "a", visitedAt: "2026-11-22T04:30:00Z" })]));
    expect(d[0].date).toBe("2026-11-21");
  });

  it("ordena as paradas do dia e soma o trajeto", () => {
    const [day] = buildDays(state([
      item({ id: "b", title: "Segunda", visitedAt: "2026-11-21T22:00:00Z", lat: 41.8919, lng: -87.6051 }),
      item({ id: "a", title: "Primeira", visitedAt: "2026-11-21T20:00:00Z", lat: 41.8827, lng: -87.6233 }),
    ]));
    expect(day.stops.map((s) => s.title)).toEqual(["Primeira", "Segunda"]);
    expect(Math.round(day.meters / 100)).toBe(18); // ~1,8 km entre os dois pontos
  });

  it("junta fotos do dia e lista os dias do mais recente para o mais antigo", () => {
    const days = buildDays(state(
      [item({ id: "a", visitedAt: "2026-11-21T20:00:00Z" })],
      [photo({ id: "f1", takenAt: "2026-11-23T18:00:00Z" }), photo({ id: "f2", takenAt: "2026-11-21T21:00:00Z" })],
    ));
    expect(days.map((d) => d.date)).toEqual(["2026-11-23", "2026-11-21"]);
    expect(days[1].photos.map((p) => p.id)).toEqual(["f2"]);
  });
});
