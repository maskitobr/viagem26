import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
const required = ["R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] as const;
function client() {
  for (const key of required) if (!process.env[key]) throw new Error("R2 não configurado.");
  return new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } });
}
// FAKE_R2=1 guarda as imagens em memória (apenas desenvolvimento/testes locais, sem credenciais).
const mem = new Map<string, { Body: Uint8Array; ContentType: string }>();
export async function putImage(Key: string, Body: Uint8Array, ContentType: string) {
  if (process.env.FAKE_R2) { mem.set(Key, { Body, ContentType }); return; }
  await client().send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET!, Key, Body, ContentType })); }
export async function getImage(Key: string) {
  if (process.env.FAKE_R2) { const m = mem.get(Key); if (!m) throw new Error("not found"); return { Body: new Blob([m.Body as BlobPart]).stream(), ContentType: m.ContentType }; }
  return client().send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key })); }
export async function deleteImage(Key: string) {
  if (process.env.FAKE_R2) { mem.delete(Key); return; }
  await client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key })); }
export function validKey(key: string) { return /^(photos|items|profiles|ideas)\/[0-9a-f-]+\.(jpg|png|webp)$/.test(key); }
