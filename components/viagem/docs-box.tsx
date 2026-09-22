"use client";
import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { DOC_KINDS, docLabel, type DocKind } from "../../lib/docs";
import { api, type State, type TripDoc } from "../../lib/client";

type Staged = { file: File; holder: string; kind: DocKind };

// Documentos de um voo ou hospedagem. São privados: cada pessoa vê apenas o que enviou.
export function DocsBox({ item, state, onChanged, onOpen, defaultKind = "outro", compact = false }: {
  item: { id: string; title: string };
  state: State;
  onChanged: () => void | Promise<void>;
  onOpen: (d: TripDoc) => void;
  defaultKind?: DocKind;
  compact?: boolean;
}) {
  const mine = state.docs.filter((d) => d.itemId === item.id);
  const [staged, setStaged] = useState<Staged[]>([]);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [msg, setMsg] = useState("");
  const input = useRef<HTMLInputElement>(null);

  function pick(files: FileList | null) {
    if (!files?.length) return;
    setMsg("");
    setStaged(Array.from(files).map((file, n) => ({ file, holder: n === 0 ? state.me.name : "", kind: defaultKind })));
    if (input.current) input.current.value = "";
  }

  async function send() {
    setBusy({ done: 0, total: staged.length });
    const errors: string[] = [];
    for (let i = 0; i < staged.length; i++) {
      const s = staged[i];
      try {
        const f = new FormData();
        f.set("file", s.file); f.set("itemId", item.id); f.set("kind", s.kind);
        if (s.holder.trim()) f.set("holder", s.holder.trim());
        await api("/api/docs", { method: "POST", body: f });
      } catch (e) { errors.push(`${s.file.name}: ${(e as Error).message}`); }
      setBusy({ done: i + 1, total: staged.length });
    }
    setBusy(null); setStaged([]);
    setMsg(errors.length ? errors.slice(0, 2).join(" · ") : "");
    await onChanged();
  }

  async function remove(d: TripDoc) {
    if (!confirm(`Remover "${d.filename}"?`)) return;
    try { await api(`/api/docs/${d.id}`, { method: "DELETE" }); } catch (e) { setMsg((e as Error).message); }
    await onChanged();
  }

  return (
    <div className={`docs ${compact ? "compact" : ""}`}>
      <div className="docs-head">
        <Paperclip size={14} /> <b>Documentos</b>
        <span className="muted">só você vê</span>
      </div>

      {mine.length > 0 && (
        <ul className="doclist">
          {mine.map((d) => (
            <li key={d.id}>
              <button className="doc-open" onClick={() => onOpen(d)}>
                {d.contentType === "application/pdf" ? <FileText size={16} /> : <ImageIcon size={16} />}
                <span className="grow">
                  <b>{d.holder || docLabel[(d.kind as DocKind)] || "Arquivo"}</b>
                  <span className="doc-sub">{d.holder ? `${docLabel[(d.kind as DocKind)] ?? "Arquivo"} · ` : ""}{d.filename}</span>
                </span>
              </button>
              <button className="doc-del" onClick={() => remove(d)} aria-label={`Remover ${d.filename}`}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}

      {msg && <p className="notice" role="alert">{msg}</p>}

      {staged.length > 0 && (
        <div className="staged">
          <p className="muted">Quem é o titular de cada arquivo?</p>
          {staged.map((s, n) => (
            <div className="staged-row" key={n}>
              <span className="doc-sub">{s.file.name}</span>
              <input placeholder="Nome do passageiro" value={s.holder} maxLength={60}
                onChange={(e) => setStaged(staged.map((x, i) => (i === n ? { ...x, holder: e.target.value } : x)))} />
              <select value={s.kind} onChange={(e) => setStaged(staged.map((x, i) => (i === n ? { ...x, kind: e.target.value as DocKind } : x)))} aria-label="Tipo">
                {DOC_KINDS.map((k) => <option key={k} value={k}>{docLabel[k]}</option>)}
              </select>
            </div>
          ))}
          <div className="staged-acts">
            <button className="link" onClick={() => setStaged([])}>Cancelar</button>
            <button className="primary" disabled={!!busy} onClick={send}>
              <Upload size={15} /> {busy ? `Enviando ${busy.done}/${busy.total}…` : `Enviar ${staged.length} ${staged.length === 1 ? "arquivo" : "arquivos"}`}
            </button>
          </div>
        </div>
      )}

      <input ref={input} type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => pick(e.target.files)} />
      {staged.length === 0 && (
        <button className="dir docs-add" onClick={() => input.current?.click()}>
          <Paperclip size={13} /> {mine.length ? "Adicionar outro documento" : "Adicionar PDF da reserva"}
        </button>
      )}
    </div>
  );
}
