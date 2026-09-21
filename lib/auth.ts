import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { people } from "../db/schema";

export const COOKIE = "viagem_token";
export type Person = typeof people.$inferSelect;

export function readToken(req: Request): string | null {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function sessionCookie(token: string) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax; Secure`;
}

export async function getPerson(req: Request): Promise<Person | null> {
  const token = readToken(req);
  if (!token) return null;
  const [p] = await (await getDb()).select().from(people).where(eq(people.token, token)).limit(1);
  return p ?? null;
}

export const json = (data: unknown, status = 200, headers?: HeadersInit) => Response.json(data, { status, headers });
export const unauthorized = () => json({ error: "Abra o seu link pessoal para entrar." }, 401);
export const fail = (e: unknown, fallback = "Algo deu errado. Tente de novo.") => {
  console.error(e);
  return json({ error: fallback }, 503);
};
