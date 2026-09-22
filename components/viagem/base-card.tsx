"use client";
import { Camera, ExternalLink, Home, Pencil } from "lucide-react";
import { formatDistance } from "../../lib/geo";
import type { Item } from "../../lib/client";
import { Directions } from "./directions";
import { PhotoButton } from "./photo-button";

// O ponto fixo sai da lista de votação e fica em destaque, ao lado das prioridades.
export function BaseCard({ item, distance, spot, onNeedLocation, canEdit, onEdit, onPhotosAdded, photoCount = 0 }: { item: Item; distance: number | null; spot: { lat: number; lng: number } | null; onNeedLocation: () => void; canEdit: boolean; onEdit: () => void; onPhotosAdded: (sent: number, errors: string[]) => void; photoCount?: number }) {
  return (
    <aside className="basebox">
      <h2><Home size={15} /> Onde ficaremos</h2>
      {item.image && <img className="base-img" src={item.image} alt={item.title} />}
      <strong>{item.title}</strong>
      {item.address && <span className="addr">{item.address}</span>}
      {distance != null && <span className="basedist">a {formatDistance(distance)} de você</span>}
      <Directions item={item} base={null} spot={spot} onNeedLocation={onNeedLocation} />
      <div className="baseacts">
        {item.mapUrl && <a className="link" href={item.mapUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Ver no mapa</a>}
        {canEdit && <button className="link" onClick={onEdit}><Pencil size={13} /> Editar</button>}
      </div>
      <PhotoButton city={item.city} itemId={item.id} label={photoCount > 0 ? `Enviar fotos (${photoCount})` : "Enviar fotos daqui"} className="dir" onDone={onPhotosAdded} />
    </aside>
  );
}
