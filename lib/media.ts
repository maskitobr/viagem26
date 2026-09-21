const types = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export const MAX_BYTES = 8 * 1024 * 1024;

export function validateImage(file: { type: string; size: number }) {
  const extension = types[file.type as keyof typeof types];
  if (!extension || file.size > MAX_BYTES || file.size === 0) throw new Error("Envie uma imagem JPG, PNG ou WebP de até 8 MB.");
  return { extension };
}
export function objectKey(kind: "photos" | "items" | "profiles", extension: string) { return `${kind}/${crypto.randomUUID()}.${extension}`; }
