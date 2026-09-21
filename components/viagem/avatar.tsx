import type { Person } from "../../lib/client";

export function Avatar({ p, size = 28 }: { p?: Person; size?: number }) {
  return <span className="avatar" title={p?.name} style={{ width: size, height: size, background: p?.color ?? "#999", fontSize: size * 0.45 }}>{(p?.name ?? "?").trim().charAt(0).toUpperCase()}</span>;
}
