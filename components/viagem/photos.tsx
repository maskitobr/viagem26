"use client";
import { useMemo, useRef, useState } from "react";
import { Camera, MapPin } from "lucide-react";
import { api, uploadPhotos, type Photo, type State } from "../../lib/client";
import { PlaceConfirm } from "./place-confirm";
import { Lightbox } from "./lightbox";
import { Avatar } from "./avatar";

export function PhotoWall({ state, city, onChanged, initialItem = "" }: { state: State; city: string; onChanged: () => void | Promise<void>; initialItem?: string }) {
  const [by, setBy] = useState(""), [itemId, setItemId] = useState(initialItem), [filterItem, setFilterItem] = useState(initialItem);
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
    const list = Array.from(files);
    setMsg(""); setProgress({ done: 0, total: list.length });
    const { sent, errors } = await uploadPhotos(list, { city, itemId }, (done, total) => setProgress({ done, total }));
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
      {view && <Lightbox photo={view} state={state} onClose={() => setView(null)} onRemove={remove} />}
    </section>
  );
}
