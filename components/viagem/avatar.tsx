import type { Person } from "../../lib/client";

export function Avatar({ p, size = 28 }: { p?: Person; size?: number }) {
  const style = { width: size, height: size, background: p?.color ?? "#999", fontSize: size * 0.45 };
  if (p?.photo) return <img className="avatar" src={p.photo} alt={p.name} title={p.name} style={{ ...style, objectFit: "cover" }} />;
  return <span className="avatar" title={p?.name} style={style}>{(p?.name ?? "?").trim().charAt(0).toUpperCase()}</span>;
}
