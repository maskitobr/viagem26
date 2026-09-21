import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { statements } from "./migrate";

let cached: Promise<ReturnType<typeof create>> | null = null;

function create() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  // Em desenvolvimento local, scripts/dev-neon-proxy.mjs imita o endpoint HTTP do Neon sobre um Postgres local.
  const proxy = process.env.NEON_LOCAL_PROXY;
  if (proxy) neonConfig.fetchEndpoint = () => proxy;
  return drizzle(neon(connectionString), { schema });
}

export function getDb() {
  cached ??= (async () => {
    const db = create();
    for (const s of statements) await db.execute(sql.raw(s));
    return db;
  })().catch((e) => { cached = null; throw e; });
  return cached;
}
