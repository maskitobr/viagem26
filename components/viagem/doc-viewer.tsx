"use client";
import { Download, ExternalLink, X } from "lucide-react";
import type { TripDoc } from "../../lib/client";

// Abre o documento em tela cheia. PDFs em iPhone às vezes mostram só a primeira página,
// por isso o atalho para abrir em outra aba fica sempre visível.
export function DocViewer({ doc, onClose }: { doc: TripDoc; onClose: () => void }) {
  const isPdf = doc.contentType === "application/pdf";
  return (
    <div className="docview" role="dialog" aria-label={doc.filename}>
      <div className="dv-top">
        <span className="dv-name">{doc.holder ? <b>{doc.holder}</b> : null} {doc.filename}</span>
        <span className="lb-actions">
          <a href={doc.url} target="_blank" rel="noreferrer" aria-label="Abrir em outra aba"><ExternalLink size={18} /> <span>Abrir</span></a>
          <a href={doc.url} download={doc.filename} aria-label="Baixar"><Download size={18} /> <span>Baixar</span></a>
          <button onClick={onClose} aria-label="Fechar"><X size={22} /></button>
        </span>
      </div>
      <div className="dv-body">
        {isPdf
          ? <iframe src={doc.url} title={doc.filename} />
          : <img src={doc.url} alt={doc.filename} />}
      </div>
    </div>
  );
}
