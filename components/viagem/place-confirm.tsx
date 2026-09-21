"use client";
import { useEffect, useMemo, useState } from "react";
import { MapPin, X } from "lucide-react";
import { ApiError, api, post, type Photo, type PlaceResult, type State } from "../../lib/client";
import { clusterByDistance } from "../../lib/geo";

type Group = { photos: Photo[]; center: { lat: number; lng: number } | null };
type Pick = { kind: "place"; place: PlaceResult } | { kind: "item"; id: string } | { kind: "manual"; title: string };

// Passo a passo: para cada grupo de fotos próximas, a pessoa confirma qual é o lugar.
export function PlaceConfirm({ state, city, onClose, onDone }: { state: State; city: string; onClose: () => void; onDone: () => void }) {
  const groups = useMemo<Group[]>(() => {
    const pending = state.photos.filter((p) => p.personId === state.me.id && p.city === city && !p.itemId).sort((a, b) => (a.takenAt ?? a.createdAt).localeCompare(b.takenAt ?? b.createdAt));
    const withGps = pending.filter((p) => p.lat != null && p.lng != null), without = pending.filter((p) => p.lat == null || p.lng == null);
    const out: Group[] = clusterByDistance(withGps.map((p) => ({ lat: p.lat!, lng: p.lng!, p }))).map((g) => ({ photos: g.members.map((m) => m.p), center: g.center }));
    if (without.length) out.push({ photos: without, center: null });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [idx, setIdx] = useState(0), [cands, setCands] = useState<PlaceResult[] | null>(null), [pick, setPick] = useState<Pick | null>(null);
  const [manual, setManual] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [noSearch, setNoSearch] = useState(false);
  const g = groups[idx], cityItems = state.items.filter((i) => i.city === city);

  useEffect(() => {
    setCands(null); setPick(null); setManual(""); setMsg("");
    if (!g?.center) return;
    let alive = true;
    api<PlaceResult[]>(`/api/places/nearby?lat=${g.center.lat}&lng=${g.center.lng}`)
      .then((r) => alive && setCands(r))
      .catch((e) => { if (!alive) return; if (e instanceof ApiError && e.code === "not_configured") setNoSearch(true); else setMsg(e.message); setCands([]); });
    return () => { alive = false; };
  }, [idx, g]);

  if (!g) return null;
  const next = () => (idx + 1 < groups.length ? setIdx(idx + 1) : onClose());

  async function confirm() {
    const chosen: Pick | null = manual.trim() ? { kind: "manual", title: manual.trim() } : pick;
    if (!chosen) return;
    setBusy(true); setMsg("");
    try {
      const photoIds = g.photos.map((p) => p.id);
      await post("/api/photos/place", chosen.kind === "item" ? { photoIds, itemId: chosen.id } : { photoIds, place: chosen.kind === "place" ? chosen.place : { title: chosen.title } });
      onDone(); next();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  const known = (p: PlaceResult) => cityItems.some((i) => i.placeId === p.placeId);

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Confirmar lugar das fotos">
        <div className="sheet-head"><h2>Onde foram tiradas?</h2><button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={20} /></button></div>
        <p className="muted">Grupo {idx + 1} de {groups.length} · {g.photos.length} {g.photos.length === 1 ? "foto" : "fotos"}{g.center ? "" : " · sem localização no arquivo"}</p>
        <div className="thumbs">{g.photos.slice(0, 6).map((p) => <img key={p.id} src={p.url} alt="" />)}{g.photos.length > 6 && <span>+{g.photos.length - 6}</span>}</div>
        {msg && <p className="notice" role="alert">{msg}</p>}
        {g.center && (
          cands === null ? <p className="muted">Procurando lugares perto de onde a foto foi tirada…</p> :
          cands.length > 0 ? (
            <ul className="results">
              {cands.map((p) => (
                <li key={p.placeId}>
                  <button className={`cand ${pick?.kind === "place" && pick.place.placeId === p.placeId && !manual ? "on" : ""}`} onClick={() => { setPick({ kind: "place", place: p }); setManual(""); }}>
                    <MapPin size={16} />
                    <span className="grow"><strong>{p.title}</strong><span className="addr">{p.category}{p.distance != null ? ` · a ${p.distance} m` : ""}{known(p) ? " · já na lista" : ""}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="muted">{noSearch ? "A busca do Google ainda não está ativa; escolha na lista ou digite o nome." : "Nenhum lugar encontrado por perto."}</p>
        )}
        <div className="manual" style={{ marginTop: 12 }}>
          {cityItems.length > 0 && (
            <label>Ou escolha um lugar da lista de {city}
              <select value={pick?.kind === "item" && !manual ? pick.id : ""} onChange={(e) => { setPick(e.target.value ? { kind: "item", id: e.target.value } : null); setManual(""); }}>
                <option value="">—</option>{cityItems.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
              </select>
            </label>
          )}
          <label>Ou digite o nome do lugar<input value={manual} maxLength={120} onChange={(e) => setManual(e.target.value)} placeholder="Ex.: Starbucks da esquina" /></label>
          <button className="primary" disabled={busy || (!pick && !manual.trim())} onClick={confirm}>{busy ? "Salvando…" : "Confirmar lugar"}</button>
          <button className="link" onClick={next}>Pular este grupo</button>
        </div>
      </div>
    </div>
  );
}
