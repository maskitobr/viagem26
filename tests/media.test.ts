import { describe, expect, it } from "vitest";
import { objectKey, validateImage } from "../lib/media";

describe("media", () => {
  it("accepts WebP and rejects invalid uploads", () => {
    expect(validateImage({ type: "image/webp", size: 2_000_000 })).toEqual({ extension: "webp" });
    expect(() => validateImage({ type: "application/pdf", size: 6_000_000 })).toThrow("Envie uma imagem");
    expect(() => validateImage({ type: "image/png", size: 9_000_000 })).toThrow("Envie uma imagem");
  });
  it("creates a constrained object key", () => expect(objectKey("photos", "jpg")).toMatch(/^photos\/[0-9a-f-]+\.jpg$/));
});
