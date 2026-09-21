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
