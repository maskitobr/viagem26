"use client";
import { useMemo, useRef, useState } from "react";
import { Camera, Download, MapPin, Trash2, X } from "lucide-react";
import { api, compress, readExif, type Photo, type State } from "../../lib/client";
import { PlaceConfirm } from "./place-confirm";
import { Avatar } from "./avatar";

export function PhotoWall({ state, city, onChanged }: { state: State; city: string; onChanged: () => void | Promise<void> }) {
  const [by, setBy] = useState(""), [itemId, setItemId] = useState(""), [filterItem, setFilterItem] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null), [msg, setMsg] = useState("");
  const [view, setView] = useState<Photo | null>(null), [organizing, setOrganizing] = useState(false), input = useRef<HTMLInputElement>(null);
  const places = state.items.filter((i) => i.city === city);
  const byId = useMemo(() => new Map(state.people.map((p) => [p.id, p])), [state.people]);
  const shown = state.photos.filter((p) => p.city === city && (!by || p.personId === by) && (!filterItem || p.itemId === filterItem))
    .sort((a, b) => (b.takenAt ?? b.createdAt).localeCompare(a.takenAt ?? a.createdAt));
  const pending = state.photos.filter((p) => p.personId === state.me.id && p.city === city && !p.itemId);
  const groups = useMemo(() => {
    const m = new Map<string, Photo[]>();
    for (const p of shown) { const k = p.itemId ?? ""; m.set(k, [...(m.get(k) ?? []), p]); }
    return [...m.entries()].sort((a, b) => (a[0] === "" ? 1 : b[0] === "" ? -1 : b[1].length - a[1].length));
  }, [shown]);
  const authors = state.people.filter((p) => state.photos.some((x) => x.city === city && x.personId === p.id));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files), errors: string[] = [];
    let sent = 0;
    setMsg(""); setProgress({ done: 0, total: list.length });
    for (let i = 0; i < list.length; i++) {
      try {
        const meta = await readExif(list[i]), f = new FormData(), small = await compress(list[i]);
        f.set("file", small); f.set("city", city); f.set("takenAt", String(meta.takenAt)); if (itemId) f.set("itemId", itemId);
        if (meta.lat != null && meta.lng != null) { f.set("lat", String(meta.lat)); f.set("lng", String(meta.lng)); }
        await api("/api/photos", { method: "POST", body: f });
        sent++;
      } catch (e) { errors.push(`${list[i].name}: ${(e as Error).message}`); }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null); if (input.current) input.current.value = "";
    if (errors.length) setMsg(errors.slice(0, 3).join(" · "));
    await onChanged();
    if (sent > 0 && !itemId) setOrganizing(true);
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
        <p className="muted">Dica: para agrupar por local automaticamente, envie fotos com a localização ativa. No iPhone, ao escolher as fotos toque em <b>Opções</b> e ative <b>Localização</b>.</p>
        <button className="primary" disabled={!!progress} onClick={() => input.current?.click()}><Camera size={18} /> {progress ? `Enviando ${progress.done}/${progress.total}…` : "Escolher fotos"}</button>
      </div>
      {msg && <p className="notice" role="alert">{msg}</p>}
      {pending.length > 0 && <div className="banner"><MapPin size={18} /> <span><b>{pending.length} {pending.length === 1 ? "foto sua" : "fotos suas"}</b> sem lugar confirmado.</span> <button className="link" onClick={() => setOrganizing(true)}>Organizar por local</button></div>}
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
        groups.map(([k, list]) => (
          <div key={k || "none"}>
            <h3 className="wall-title">{k ? (places.find((i) => i.id === k)?.title ?? "Lugar") : "Sem lugar definido"} <small>{list.length}</small></h3>
            <div className="wall">{list.map((p) => <button key={p.id} onClick={() => setView(p)} aria-label="Ver foto"><img src={p.url} alt={`Foto de ${byId.get(p.personId)?.name ?? ""} em ${city}`} loading="lazy" /></button>)}</div>
          </div>
        ))
      )}
      {organizing && <PlaceConfirm state={state} city={city} onClose={() => setOrganizing(false)} onDone={() => { onChanged(); }} />}
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
