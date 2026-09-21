"use client";
import { useMemo, useRef, useState } from "react";
import { Camera, Download, Trash2, X } from "lucide-react";
import { api, compress, type Photo, type State } from "../../lib/client";
import { Avatar } from "./avatar";

export function PhotoWall({ state, city, onChanged }: { state: State; city: string; onChanged: () => void }) {
  const [by, setBy] = useState(""), [itemId, setItemId] = useState(""), [filterItem, setFilterItem] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null), [msg, setMsg] = useState("");
  const [view, setView] = useState<Photo | null>(null), input = useRef<HTMLInputElement>(null);
  const places = state.items.filter((i) => i.city === city);
  const byId = useMemo(() => new Map(state.people.map((p) => [p.id, p])), [state.people]);
  const shown = state.photos.filter((p) => p.city === city && (!by || p.personId === by) && (!filterItem || p.itemId === filterItem))
    .sort((a, b) => (b.takenAt ?? b.createdAt).localeCompare(a.takenAt ?? a.createdAt));
  const authors = state.people.filter((p) => state.photos.some((x) => x.city === city && x.personId === p.id));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files), errors: string[] = [];
    setMsg(""); setProgress({ done: 0, total: list.length });
    for (let i = 0; i < list.length; i++) {
      try {
        const f = new FormData(), small = await compress(list[i]);
        f.set("file", small); f.set("city", city); f.set("takenAt", String(list[i].lastModified)); if (itemId) f.set("itemId", itemId);
        await api("/api/photos", { method: "POST", body: f });
      } catch (e) { errors.push(`${list[i].name}: ${(e as Error).message}`); }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null); if (input.current) input.current.value = "";
    if (errors.length) setMsg(errors.slice(0, 3).join(" · "));
    onChanged();
  }

  async function remove(p: Photo) {
    if (!confirm("Remover esta foto?")) return;
    try { await api(`/api/photos/${p.id}`, { method: "DELETE" }); setView(null); onChanged(); } catch (e) { setMsg((e as Error).message); }
  }

  return (
    <section>
      <div className="uploadbox">
        <div><strong>Enviar fotos de {city}</strong><span className="muted">Pode escolher várias de uma vez.</span></div>
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} aria-label="Lugar da foto (opcional)">
          <option value="">Sem lugar específico</option>{places.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
        </select>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
        <button className="primary" disabled={!!progress} onClick={() => input.current?.click()}><Camera size={18} /> {progress ? `Enviando ${progress.done}/${progress.total}…` : "Escolher fotos"}</button>
      </div>
      {msg && <p className="notice" role="alert">{msg}</p>}
      <div className="filters">
        <button className={!by ? "on" : ""} onClick={() => setBy("")}>Todos</button>
        {authors.map((p) => <button key={p.id} className={by === p.id ? "on" : ""} onClick={() => setBy(p.id)}><Avatar p={p} size={18} /> {p.name}</button>)}
        {places.some((i) => state.photos.some((p) => p.itemId === i.id)) && (
          <select value={filterItem} onChange={(e) => setFilterItem(e.target.value)} aria-label="Filtrar por lugar">
            <option value="">Todos os lugares</option>{places.filter((i) => state.photos.some((p) => p.itemId === i.id)).map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
          </select>
        )}
      </div>
      {shown.length === 0 ? <p className="empty">Ainda não há fotos em {city}. Seja o primeiro a enviar!</p> : (
        <div className="wall">{shown.map((p) => <button key={p.id} onClick={() => setView(p)} aria-label="Ver foto"><img src={p.url} alt={`Foto de ${byId.get(p.personId)?.name ?? ""} em ${city}`} loading="lazy" /></button>)}</div>
      )}
      {view && (
        <div className="lightbox" onClick={() => setView(null)}>
          <div className="lb-top" onClick={(e) => e.stopPropagation()}>
            <span><Avatar p={byId.get(view.personId)} size={24} /> {byId.get(view.personId)?.name}{view.itemId ? ` · ${state.items.find((i) => i.id === view.itemId)?.title ?? ""}` : ""}</span>
            <span className="lb-actions">
              <a href={view.url} download aria-label="Baixar"><Download size={20} /></a>
              {(view.personId === state.me.id || state.me.isAdmin) && <button onClick={() => remove(view)} aria-label="Remover"><Trash2 size={20} /></button>}
              <button onClick={() => setView(null)} aria-label="Fechar"><X size={22} /></button>
            </span>
          </div>
          <img src={view.url} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}
