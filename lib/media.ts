const types = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export function validateImage(file: { type: string; size: number }) {
  const extension = types[file.type as keyof typeof types];
  if (!extension || file.size > 5 * 1024 * 1024) throw new Error("Envie uma imagem JPG, PNG ou WebP de até 5 MB.");
  return { extension };
}
export function objectKey(kind: "profiles" | "ideas", extension: string) { return `${kind}/${crypto.randomUUID()}.${extension}`; }
