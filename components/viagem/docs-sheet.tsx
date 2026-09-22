"use client";
import { FileText, Image as ImageIcon, Paperclip, X } from "lucide-react";
import { docLabel, type DocKind } from "../../lib/docs";
import type { State, TripDoc } from "../../lib/client";

// Todos os meus documentos em um lugar só, para achar rápido na imigração ou no check-in.
export function DocsSheet({ state, onClose, onOpen }: { state: State; onClose: () => void; onOpen: (d: TripDoc) => void }) {
  const groups = new Map<string, TripDoc[]>();
  for (const d of state.docs) groups.set(d.itemId, [...(groups.get(d.itemId) ?? []), d]);
  const titleOf = (id: string) => state.items.find((i) => i.id === id)?.title ?? "Documento";

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Meus documentos">
        <div className="sheet-head"><h2>Meus documentos</h2><button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={20} /></button></div>
        {state.docs.length === 0 ? (
          <p className="empty"><Paperclip size={26} /><br />Você ainda não guardou nenhum documento.<br />
            <span className="muted">Abra um voo ou a hospedagem e anexe o PDF da passagem ou da reserva. Só você enxerga esses arquivos.</span></p>
        ) : (
          [...groups.entries()].map(([itemId, list]) => (
            <div className="docgroup" key={itemId}>
              <h3>{titleOf(itemId)}</h3>
              <ul className="doclist">
                {list.map((d) => (
                  <li key={d.id}>
                    <button className="doc-open" onClick={() => onOpen(d)}>
                      {d.contentType === "application/pdf" ? <FileText size={16} /> : <ImageIcon size={16} />}
                      <span className="grow">
                        <b>{d.holder || docLabel[(d.kind as DocKind)] || "Arquivo"}</b>
                        <span className="doc-sub">{d.holder ? `${docLabel[(d.kind as DocKind)] ?? "Arquivo"} · ` : ""}{d.filename}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
