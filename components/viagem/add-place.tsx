"use client";
import { useState } from "react";
import { Plus, Search, Star, X } from "lucide-react";
import { ApiError, CATEGORIES, api, compress, type PlaceResult } from "../../lib/client";

export function AddPlace({ city, onClose, onAdded }: { city: string; onClose: () => void; onAdded: () => void }) {
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [q, setQ] = useState(""), [results, setResults] = useState<PlaceResult[] | null>(null);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const [m, setM] = useState({ title: "", category: "Passeio", address: "", note: "" }), [file, setFile] = useState<File | null>(null);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true); setMsg("");
    try { setResults(await api<PlaceResult[]>(`/api/places/search?city=${city}&q=${encodeURIComponent(q)}`)); }
    catch (err) {
      if (err instanceof ApiError && err.code === "not_configured") { setMode("manual"); }
      setMsg((err as Error).message);
    }
    setBusy(false);
  }

  async function submit(fields: Record<string, string | number | null | undefined>, image?: File | null) {
    setBusy(true); setMsg("");
    try {
      const f = new FormData();
      f.set("city", city);
      for (const [k, v] of Object.entries(fields)) if (v != null && v !== "") f.set(k, String(v));
      if (image) f.set("image", await compress(image));
      await api("/api/suggestions", { method: "POST", body: f });
      onAdded(); onClose();
    } catch (err) { setMsg((err as Error).message); setBusy(false); }
  }

  const addResult = (p: PlaceResult) => submit({ title: p.title, category: p.category, address: p.address, mapUrl: p.mapUrl, placeId: p.placeId, rating: p.rating, priceLevel: p.priceLevel, photoName: p.photoName });

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Adicionar lugar em ${city}`}>
        <div className="sheet-head"><h2>Adicionar em {city}</h2><button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={20} /></button></div>
        <div className="seg">
          <button className={mode === "search" ? "on" : ""} onClick={() => setMode("search")}>Buscar no Google</button>
          <button className={mode === "manual" ? "on" : ""} onClick={() => setMode("manual")}>Adicionar à mão</button>
        </div>
        {msg && <p className="notice" role="alert">{msg}</p>}
        {mode === "search" ? (
          <>
            <form className="searchbar" onSubmit={search}>
              <Search size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`pizza, museu, parque em ${city}…`} aria-label="Buscar lugares" autoFocus />
              <button disabled={busy || !q.trim()}>{busy ? "…" : "Buscar"}</button>
            </form>
            {results && results.length === 0 && <p className="muted">Nada encontrado. Tente outras palavras.</p>}
            <ul className="results">
              {results?.map((p) => (
                <li key={p.placeId}>
                  {p.photoName ? <img src={`/api/places/photo?name=${encodeURIComponent(p.photoName)}`} alt="" loading="lazy" /> : <div className="ph" />}
                  <div className="grow">
                    <strong>{p.title}</strong>
                    <span className="meta">{p.category}{p.rating ? <> · <Star size={12} fill="currentColor" /> {p.rating.toFixed(1)}</> : null}{p.priceLevel ? ` · ${p.priceLevel}` : ""}</span>
                    <span className="addr">{p.address}</span>
                  </div>
                  <button className="add" disabled={busy} onClick={() => addResult(p)} aria-label={`Adicionar ${p.title}`}><Plus size={18} /></button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <form className="manual" onSubmit={(e) => { e.preventDefault(); submit(m, file); }}>
            <label>Nome do lugar<input required maxLength={120} value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} /></label>
            <label>Categoria<select value={m.category} onChange={(e) => setM({ ...m, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Endereço (opcional)<input maxLength={250} value={m.address} onChange={(e) => setM({ ...m, address: e.target.value })} /></label>
            <label>Por que vale a pena? (opcional)<textarea maxLength={500} rows={3} value={m.note} onChange={(e) => setM({ ...m, note: e.target.value })} /></label>
            <label>Foto (opcional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
            <button className="primary" disabled={busy || !m.title.trim()}>{busy ? "Salvando…" : "Adicionar à lista"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
