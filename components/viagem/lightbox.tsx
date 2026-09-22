"use client";
import { Download, Trash2, X } from "lucide-react";
import type { Photo, State } from "../../lib/client";
import { Avatar } from "./avatar";

// Foto em tela cheia, com autor, lugar, download e remoção de quem enviou.
export function Lightbox({ photo, state, onClose, onRemove }: { photo: Photo; state: State; onClose: () => void; onRemove?: (p: Photo) => void }) {
  const author = state.people.find((p) => p.id === photo.personId);
  const place = photo.itemId ? state.items.find((i) => i.id === photo.itemId)?.title : null;
  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lb-top" onClick={(e) => e.stopPropagation()}>
        <span><Avatar p={author} size={24} /> {author?.name}{place ? ` · ${place}` : ""}</span>
        <span className="lb-actions">
          <a href={photo.url} download><Download size={18} /> <span>Baixar</span></a>
          {onRemove && (photo.personId === state.me.id || state.me.isAdmin) && (
            <button className="lb-del" onClick={() => onRemove(photo)}><Trash2 size={18} /> <span>Excluir</span></button>
          )}
          <button onClick={onClose} aria-label="Fechar"><X size={22} /></button>
        </span>
      </div>
      <img src={photo.url} alt="" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
