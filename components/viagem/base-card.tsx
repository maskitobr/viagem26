"use client";
import { ExternalLink, Home } from "lucide-react";
import { formatDistance } from "../../lib/geo";
import type { Item } from "../../lib/client";
import { Directions } from "./directions";

// O ponto fixo sai da lista de votação e fica em destaque, ao lado das prioridades.
export function BaseCard({ item, distance, spot, onNeedLocation }: { item: Item; distance: number | null; spot: { lat: number; lng: number } | null; onNeedLocation: () => void }) {
  return (
    <aside className="basebox">
      <h2><Home size={15} /> Onde ficaremos</h2>
      <strong>{item.title}</strong>
      {item.address && <span className="addr">{item.address}</span>}
      {distance != null && <span className="basedist">a {formatDistance(distance)} de você</span>}
      <Directions item={item} base={null} spot={spot} onNeedLocation={onNeedLocation} />
      {item.mapUrl && <a className="link" href={item.mapUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Ver no mapa</a>}
    </aside>
  );
}
