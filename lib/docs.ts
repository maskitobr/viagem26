// Tipos aceitos para documentos da viagem: PDF e fotos de passagens/reservas.
const TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};
export const MAX_DOC_BYTES = 12 * 1024 * 1024;
export const DOC_KINDS = ["passagem", "reserva", "documento", "outro"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export function validateDoc(file: { type: string; size: number }) {
  const extension = TYPES[file.type];
  if (!extension) throw new Error("Envie um PDF ou uma imagem da reserva.");
  if (file.size > MAX_DOC_BYTES || file.size === 0) throw new Error("O arquivo precisa ter até 12 MB.");
  return { extension };
}

export const docKey = (extension: string) => `docs/${crypto.randomUUID()}.${extension}`;
export const isDocKind = (v: unknown): v is DocKind => typeof v === "string" && (DOC_KINDS as readonly string[]).includes(v);
export const docLabel: Record<DocKind, string> = { passagem: "Passagem", reserva: "Reserva", documento: "Documento", outro: "Arquivo" };
