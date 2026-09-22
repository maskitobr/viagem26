import { AwsClient } from "aws4fetch";

const required = ["R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] as const;

// API S3 do R2 assinada com SigV4 via fetch (o SDK oficial da AWS não roda no bundle de produção).
function target(key: string) {
  for (const k of required) if (!process.env[k]) throw new Error("R2 não configurado.");
  const client = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, service: "s3", region: "auto" });
  const base = process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return { client, url: `${base}/${process.env.R2_BUCKET}/${key}` };
}

// FAKE_R2=1 guarda as imagens em memória (apenas desenvolvimento/testes locais, sem credenciais).
const mem = new Map<string, { Body: Uint8Array; ContentType: string }>();

export async function putImage(Key: string, Body: Uint8Array, ContentType: string) {
  if (process.env.FAKE_R2) { mem.set(Key, { Body, ContentType }); return; }
  const { client, url } = target(Key);
  const r = await client.fetch(url, { method: "PUT", body: Body as BodyInit, headers: { "Content-Type": ContentType } });
  if (!r.ok) throw new Error(`R2 PUT falhou (${r.status}): ${(await r.text()).slice(0, 200)}`);
}

export async function getImage(Key: string): Promise<{ Body: ReadableStream; ContentType?: string }> {
  if (process.env.FAKE_R2) {
    const m = mem.get(Key);
    if (!m) throw new Error("not found");
    return { Body: new Blob([m.Body as BlobPart]).stream(), ContentType: m.ContentType };
  }
  const { client, url } = target(Key);
  const r = await client.fetch(url);
  if (!r.ok || !r.body) throw new Error(`R2 GET falhou (${r.status})`);
  return { Body: r.body, ContentType: r.headers.get("content-type") ?? undefined };
}

export async function deleteImage(Key: string) {
  if (process.env.FAKE_R2) { mem.delete(Key); return; }
  const { client, url } = target(Key);
  const r = await client.fetch(url, { method: "DELETE" });
  if (!r.ok && r.status !== 404) throw new Error(`R2 DELETE falhou (${r.status})`);
}

export function validKey(key: string) { return /^(photos|items|profiles|ideas)\/[0-9a-f-]+\.(jpg|png|webp)$/.test(key); }
export const putFile = putImage, getFile = getImage, deleteFile = deleteImage;
