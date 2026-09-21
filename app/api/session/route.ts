import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { people } from "../../../db/schema";
import { fail, json, sessionCookie } from "../../../lib/auth";

export async function POST(req: Request) {
  try {
    const { token } = (await req.json()) as { token?: string };
    if (!token) return json({ error: "Link inválido." }, 400);
    const [p] = await (await getDb()).select().from(people).where(eq(people.token, token)).limit(1);
    if (!p) return json({ error: "Este link não é válido. Peça um novo ao organizador." }, 404);
    return json({ id: p.id, name: p.name }, 200, { "Set-Cookie": sessionCookie(token) });
  } catch (e) { return fail(e); }
}
