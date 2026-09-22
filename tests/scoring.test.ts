import { describe, expect, it } from "vitest";
import { isNewFor, rank, score } from "../lib/scoring";
import { normalizePlace } from "../lib/places";

describe("scoring", () => {
  it("weights votes 2/1/0", () => expect(score({ a: "quero", b: "talvez", c: "passo", d: "lixo" })).toBe(3));
  it("ranks by score, then participation", () => {
    const items: { id: string; votes: Record<string, string>; createdAt: string }[] = [
      { id: "x", votes: { a: "talvez" }, createdAt: "1" },
      { id: "y", votes: { a: "quero" }, createdAt: "2" },
      { id: "z", votes: { a: "quero", b: "passo" }, createdAt: "3" },
    ];
    expect(rank(items).map((i) => i.id)).toEqual(["z", "y", "x"]);
  });
  it("marks NOVO only for others' unseen items", () => {
    const seen = new Set(["b"]);
    expect(isNewFor({ id: "a", createdBy: "p2" }, "p1", seen)).toBe(true);
    expect(isNewFor({ id: "b", createdBy: "p2" }, "p1", seen)).toBe(false);
    expect(isNewFor({ id: "a", createdBy: "p1" }, "p1", seen)).toBe(false);
  });
});
describe("places", () => {
  it("normalizes a Google place", () => {
    const p = normalizePlace({ id: "abc", displayName: { text: "Lou Malnati's" }, formattedAddress: "1 Main St", rating: 4.6, priceLevel: "PRICE_LEVEL_MODERATE", photos: [{ name: "places/abc/photos/xyz" }] });
    expect(p).toMatchObject({ title: "Lou Malnati's", rating: 4.6, priceLevel: "$$", photoName: "places/abc/photos/xyz" });
  });
});

import { clusterByDistance, distanceMeters, validCoords } from "../lib/geo";
describe("geo", () => {
  it("measures distance", () => expect(Math.round(distanceMeters({ lat: 41.8781, lng: -87.6298 }, { lat: 41.8791, lng: -87.6298 }))).toBeGreaterThan(100));
  it("clusters nearby photos and separates far ones", () => {
    const g = clusterByDistance([{ lat: 41.8781, lng: -87.6298 }, { lat: 41.87815, lng: -87.62985 }, { lat: 32.7767, lng: -96.797 }]);
    expect(g.map((x) => x.members.length)).toEqual([2, 1]);
  });
  it("rejects bad coordinates", () => { expect(validCoords(0, 0)).toBe(false); expect(validCoords(91, 0)).toBe(false); expect(validCoords(41.8, -87.6)).toBe(true); });
});

import { validDate } from "../lib/dates";
describe("dates", () => {
  it("accepts real trip dates only", () => {
    expect(validDate("2026-12-03")).toBe(true);
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("03/12/2026")).toBe(false);
    expect(validDate(null)).toBe(false);
  });
});

import { formatDistance } from "../lib/geo";
describe("formatDistance", () => {
  it("reads well near and far", () => {
    expect(formatDistance(120)).toBe("120 m");
    expect(formatDistance(1500)).toBe("1,5 km");
    expect(formatDistance(42_000)).toBe("42 km");
    expect(formatDistance(7_600_000)).toBe("7.600 km");
  });
});
