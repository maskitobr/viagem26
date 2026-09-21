import { count } from "drizzle-orm";
import { getDb } from "../../../../db";
import { people } from "../../../../db/schema";
import { fail, getPerson, json, sessionCookie } from "../../../../lib/auth";

const colors = ["#e4572e", "#2e86ab", "#3c9d5d", "#a23b72", "#f0a202", "#5c4d7d", "#1b998b", "#c44536"];
const newToken = () => crypto.randomUUID().replace(/-/g, "");

// Primeira pessoa criada vira administradora e já entra logada; depois só admins criam pessoas.
export async function GET(req: Request) {
  try {
    const me = await getPerson(req), db = await getDb();
    const [{ n }] = await db.select({ n: count() }).from(people);
    if (Number(n) === 0) return json({ bootstrap: true, people: [] });
    if (!me?.isAdmin) return json({ error: "Somente o organizador acessa esta página." }, 403);
    return json({ people: (await db.select().from(people)).map((p) => ({ id: p.id, name: p.name, token: p.token, isAdmin: p.isAdmin })) });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const { name } = (await req.json()) as { name?: string };
    if (!name?.trim()) return json({ error: "Informe o nome." }, 400);
    const me = await getPerson(req), db = await getDb();
    const [{ n }] = await db.select({ n: count() }).from(people);
    const first = Number(n) === 0;
    if (!first && !me?.isAdmin) return json({ error: "Somente o organizador pode adicionar pessoas." }, 403);
    const p = { id: crypto.randomUUID(), name: name.trim().slice(0, 40), color: colors[Number(n) % colors.length], token: newToken(), isAdmin: first };
    await db.insert(people).values(p);
    return json({ id: p.id, name: p.name, token: p.token, isAdmin: p.isAdmin }, 201, first ? { "Set-Cookie": sessionCookie(p.token) } : undefined);
  } catch (e) { return fail(e); }
}
