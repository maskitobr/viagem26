"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Camera, Check, Map, MapPin, Paperclip, Plus, Route, Sparkles } from "lucide-react";
import type { Item } from "../../lib/client";
import { ApiError, CITIES, api, patch, post, score, type Choice, type State } from "../../lib/client";
import { Avatar } from "./avatar";
import { AddPlace } from "./add-place";
import { PhotoWall } from "./photos";
import { PlaceCard } from "./place-card";
import { Agenda } from "./agenda";
import { ProfilePhotoEditor } from "./profile-photo";
import { BaseCard } from "./base-card";
import { Priorities } from "./priorities";
import { EditPlace } from "./edit-place";
import { Memory } from "./memory";
import { ArrivalBox } from "./arrival";
import { DocsBox } from "./docs-box";
import { DocsSheet } from "./docs-sheet";
import { DocViewer } from "./doc-viewer";
import type { TripDoc } from "../../lib/client";
import { TripMap } from "./map";
import { useMyLocation } from "./use-location";
import { distanceMeters } from "../../lib/geo";

const TRIP = new Date("2026-11-19T00:00:00-03:00");

export function App() {
  const [state, setState] = useState<State | null>(null), [error, setError] = useState<string | null>(null), [denied, setDenied] = useState(false);
  const [city, setCity] = useState<string>(CITIES[0]), [tab, setTab] = useState<"mapa" | "lugares" | "fotos" | "agenda" | "memoria">("lugares"), [sort, setSort] = useState<"votos" | "perto" | "base">("votos"), [focus, setFocus] = useState(""), [showDone, setShowDone] = useState(false), [editing, setEditing] = useState<Item | null>(null), [doc, setDoc] = useState<TripDoc | null>(null), [docsOpen, setDocsOpen] = useState(false), [photoItem, setPhotoItem] = useState(""), [adding, setAdding] = useState(false), [editingPhoto, setEditingPhoto] = useState(false), [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try { setState(await api<State>("/api/state")); setError(null); setDenied(false); }
    catch (e) { if (e instanceof ApiError && e.status === 401) setDenied(true); else setError((e as Error).message); }
  }, []);

  useEffect(() => {
    (async () => {
      const u = new URL(location.href), token = u.searchParams.get("p");
      if (token) {
        try { await post("/api/session", { token }); u.searchParams.delete("p"); history.replaceState(null, "", u.pathname + u.search); }
        catch (e) { setError((e as Error).message); }
      }
      await load();
    })();
    const t = setInterval(load, 20000), onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);

  const geo = useMyLocation(), spot = geo.spot;
  const base = useMemo(() => state?.items.find((i) => i.city === city && i.isBase && i.lat != null) ?? null, [state, city]);
  const distanceOf = useCallback((i: { lat: number | null; lng: number | null }) => (spot && i.lat != null && i.lng != null ? distanceMeters(spot, { lat: i.lat, lng: i.lng }) : null), [spot]);

  // Itens antigos foram salvos sem coordenada; ao abrir o mapa o servidor resolve os que faltam, uma vez.
  const located = useRef(false);
  useEffect(() => {
    if (tab !== "mapa" || located.current || !state?.items.some((i) => i.lat == null)) return;
    located.current = true;
    (async () => {
      for (let round = 0; round < 5; round++) {
        const r = await post<{ located: number; pending: number }>("/api/items/locate").catch(() => null);
        if (!r || r.located === 0) break;
        await load();
        if (r.pending === 0) break;
      }
    })();
  }, [tab, state, load]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const days = Math.max(0, Math.ceil((TRIP.getTime() - Date.now()) / 86400000));

  const fromBase = useCallback((i: { id: string; lat: number | null; lng: number | null }) => (base && base.id !== i.id && i.lat != null && i.lng != null ? distanceMeters({ lat: base.lat!, lng: base.lng! }, { lat: i.lat, lng: i.lng }) : null), [base]);

  const items = useMemo(() => {
    const list = (state?.items ?? []).filter((i) => i.city === city && !i.isBase);
    if (sort === "base" && base) return list.sort((a, b) => (fromBase(a) ?? Infinity) - (fromBase(b) ?? Infinity));
    if (sort === "perto" && spot) return list.sort((a, b) => (distanceOf(a) ?? Infinity) - (distanceOf(b) ?? Infinity));
    return list.sort((a, b) => score(b.votes) - score(a.votes) || Object.keys(b.votes).length - Object.keys(a.votes).length || a.createdAt.localeCompare(b.createdAt));
  }, [state, city, sort, spot, base, distanceOf, fromBase]);
  const newBy = (c: string) => state?.items.filter((i) => i.city === c && i.isNew) ?? [];

  async function vote(id: string, choice: Choice | null) {
    setState((s) => s && { ...s, items: s.items.map((i) => { if (i.id !== id) return i; const v = { ...i.votes }; if (choice) v[s.me.id] = choice; else delete v[s.me.id]; return { ...i, votes: v, isNew: false }; }) });
    try { await post(`/api/suggestions/${id}/vote`, { choice }); } catch (e) { flash((e as Error).message); }
    load();
  }
  async function seen(id: string) {
    setState((s) => s && { ...s, items: s.items.map((i) => (i.id === id ? { ...i, isNew: false } : i)) });
    post(`/api/suggestions/${id}/seen`).catch(() => {});
  }
  // Check-in vale para a família toda: o lugar sai da lista e vai para "Já visitamos".
  async function checkIn(item: { id: string; title: string }, visited: boolean) {
    setState((s) => s && { ...s, items: s.items.map((i) => (i.id === item.id ? { ...i, visitedBy: visited ? s.me.id : null, visitedAt: visited ? new Date().toISOString() : null } : i)) });
    try { await patch(`/api/suggestions/${item.id}`, { visited, today: new Date().toLocaleDateString("sv-SE") }); flash(visited ? `${item.title}: visitado!` : `${item.title} voltou para a lista.`); }
    catch (e) { flash((e as Error).message); }
    load();
  }

  const photosOf = useCallback((id: string) => (state?.photos ?? []).filter((p) => p.itemId === id).length, [state]);
  const onPhotosAdded = (sent: number, errors: string[]) => { if (sent) flash(`${sent} ${sent === 1 ? "foto enviada" : "fotos enviadas"}!`); if (errors.length) flash(errors[0]); load(); };
  const seePhotos = (i: Item) => { setCity(i.city); setPhotoItem(i.id); setTab("fotos"); };

  function focusItem(id: string) {
    setFocus(id);
    setTimeout(() => document.getElementById(`item-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    setTimeout(() => setFocus(""), 2600);
  }

  async function remove(id: string) {
    try { await api(`/api/suggestions/${id}`, { method: "DELETE" }); flash("Item removido."); } catch (e) { flash((e as Error).message); }
    load();
  }

  if (denied) return <Gate />;
  if (!state) return <main className="wrap"><p className="muted center">{error ?? "Carregando a viagem…"}</p></main>;

  const myNew = newBy(city), allNew = state.items.filter((i) => i.isNew);
  const newAuthors = [...new Set(myNew.map((i) => state.people.find((p) => p.id === i.createdBy)?.name).filter(Boolean))];
  const pending = items.filter((i) => !i.visitedBy), done = items.filter((i) => i.visitedBy);
  const top = pending.filter((i) => i.kind === "place" && score(i.votes) > 0).slice(0, 10);

  return (
    <main className="wrap">
      <header className="hero">
        <div>
          <p className="eyebrow">GRU → Chicago → Dallas → Orlando</p>
          <h1>Nossa Viagem <em>2026</em></h1>
          <p className="count"><b>{days}</b> dias para embarcar</p>
        </div>
        <div className="me">
          <button className="docs-btn" onClick={() => setDocsOpen(true)} aria-label="Meus documentos" title="Meus documentos">
            <Paperclip size={16} />{state.docs.length > 0 && <i>{state.docs.length}</i>}
          </button>
          <button className="me-btn" onClick={() => setEditingPhoto(true)} aria-label="Trocar minha foto de perfil" title="Trocar minha foto"><Avatar p={state.me} size={40} /></button><span>{state.me.name}</span>{state.me.isAdmin && <a href="/admin">Admin</a>}</div>
      </header>

      {error && <p className="notice" role="alert">{error}</p>}

      <nav className="tabs" aria-label="Seções">
        <button className={`tab-map ${tab === "mapa" ? "on" : ""}`} onClick={() => setTab("mapa")} aria-label="Mapa das atrações" title="Mapa das atrações"><Map size={20} /></button>
        <button className={`tab-small ${tab === "lugares" ? "on" : ""}`} onClick={() => setTab("lugares")}><MapPin size={15} /> Lugares{allNew.length > 0 && <i className="dot">{allNew.length}</i>}</button>
        <button className={tab === "fotos" ? "on" : ""} onClick={() => { setPhotoItem(""); setTab("fotos"); }}><Camera size={16} /> Fotos</button>
        <button className={tab === "agenda" ? "on" : ""} onClick={() => setTab("agenda")}><CalendarDays size={16} /> Agenda</button>
        <button className={tab === "memoria" ? "on" : ""} onClick={() => setTab("memoria")}><Route size={16} /> Memória</button>
      </nav>

      {(tab === "lugares" || tab === "fotos") && <div className="cities" role="tablist">
        {CITIES.map((c) => (
          <button key={c} role="tab" aria-selected={city === c} className={city === c ? "on" : ""} onClick={() => setCity(c)}>
            {c}{tab === "lugares" && newBy(c).length > 0 && <i className="dot">{newBy(c).length}</i>}
          </button>
        ))}
      </div>}

      {tab === "lugares" ? (
        <section>
          {myNew.length > 0 && <div className="banner"><Sparkles size={18} /> <span><b>{myNew.length} {myNew.length === 1 ? "item novo" : "itens novos"}</b> em {city} para você avaliar{newAuthors.length ? ` (de ${newAuthors.join(", ")})` : ""}.</span></div>}
          <ArrivalBox state={state} city={city} onChanged={load} onOpenDoc={setDoc} />
          {(top.length > 0 || base) && (
            <div className={`topgrid ${top.length > 0 && base ? "two" : ""}`}>
              {base && <BaseCard item={base} distance={distanceOf(base)} spot={spot} onNeedLocation={geo.start} canEdit={base.createdBy === state.me.id || state.me.isAdmin} onEdit={() => setEditing(base)} onPhotosAdded={onPhotosAdded} photoCount={photosOf(base.id)} state={state} onChanged={load} onOpenDoc={setDoc} />}
              {top.length > 0 && <Priorities city={city} items={top} distanceOf={distanceOf} fromBase={fromBase} onCheckIn={(i) => checkIn(i, true)} onOpen={focusItem} />}
            </div>
          )}
          {items.length > 1 && (
            <div className={`seg sortseg ${base ? "three" : ""}`}>
              <button className={sort === "votos" ? "on" : ""} onClick={() => setSort("votos")}>Mais votados</button>
              <button className={sort === "perto" ? "on" : ""} onClick={() => { setSort("perto"); if (!spot) geo.start(); }}>Perto de mim{sort === "perto" && !spot ? "…" : ""}</button>
              {base && <button className={sort === "base" ? "on" : ""} onClick={() => setSort("base")}>Perto da base</button>}
            </div>
          )}
          {sort === "perto" && !spot && <p className="muted">{geo.message || "Procurando sua localização…"}</p>}
          <button className="primary wide" onClick={() => setAdding(true)}><Plus size={18} /> {city === "Voos" ? "Adicionar voo" : `Adicionar lugar em ${city}`}</button>
          {pending.length === 0 ? <p className="empty">{done.length > 0 ? `Tudo visitado em ${city}! 🎉` : `Nenhum lugar em ${city} ainda. Busque um restaurante ou passeio e adicione!`}</p> : (
            <div className="list">{pending.map((i, idx) => <PlaceCard key={i.id} item={i} state={state} rank={idx + 1} onVote={(c) => vote(i.id, c)} onOpen={() => seen(i.id)} onDelete={() => remove(i.id)} onChanged={load} distance={distanceOf(i)} fromBase={fromBase(i)} focus={focus === i.id} base={base} spot={spot} onNeedLocation={geo.start} onCheckIn={(v) => checkIn(i, v)} onEdit={() => setEditing(i)} onSeePhotos={() => seePhotos(i)} onPhotosAdded={onPhotosAdded} photoCount={photosOf(i.id)} onChanged2={load} onOpenDoc={setDoc} />)}</div>
          )}
          {done.length > 0 && (
            <div className="donebox">
              <button className="done-head" onClick={() => setShowDone(!showDone)} aria-expanded={showDone}>
                <Check size={16} /> Já visitamos em {city} <i className="dot done-n">{done.length}</i> <span className="muted">{showDone ? "esconder" : "ver"}</span>
              </button>
              {showDone && <div className="list">{done.map((i) => <PlaceCard key={i.id} item={i} state={state} rank={0} onVote={(c) => vote(i.id, c)} onOpen={() => seen(i.id)} onDelete={() => remove(i.id)} onChanged={load} distance={distanceOf(i)} fromBase={fromBase(i)} focus={focus === i.id} base={base} spot={spot} onNeedLocation={geo.start} onCheckIn={(v) => checkIn(i, v)} onEdit={() => setEditing(i)} onSeePhotos={() => seePhotos(i)} onPhotosAdded={onPhotosAdded} photoCount={photosOf(i.id)} onChanged2={load} onOpenDoc={setDoc} />)}</div>}
            </div>
          )}
        </section>
      ) : tab === "mapa" ? (
        <TripMap state={state} city={city} setCity={setCity} location={geo} onOpenItem={(id) => {
          const it = state.items.find((x) => x.id === id);
          if (!it) return;
          setCity(it.city); setTab("lugares"); setFocus(id); seen(id);
          setTimeout(() => { document.getElementById(`item-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 80);
          setTimeout(() => setFocus(""), 2600);
        }} />
      ) : tab === "fotos" ? <PhotoWall state={state} city={city} onChanged={load} initialItem={photoItem} /> : tab === "agenda" ? <Agenda state={state} onChanged={load} /> : <Memory state={state} onRemovePhoto={async (p) => {
        if (!confirm("Remover esta foto?")) return;
        try { await api(`/api/photos/${p.id}`, { method: "DELETE" }); flash("Foto removida."); } catch (e) { flash((e as Error).message); }
        load();
      }} />}
      {doc && <DocViewer doc={doc} onClose={() => setDoc(null)} />}
      {docsOpen && <DocsSheet state={state} onClose={() => setDocsOpen(false)} onOpen={(d) => { setDocsOpen(false); setDoc(d); }} />}
      {editing && <EditPlace item={editing} onClose={() => setEditing(null)} onSaved={() => { flash("Lugar atualizado."); load(); }} />}
      {editingPhoto && <ProfilePhotoEditor name={state.me.name} hasPhoto={!!state.me.photo} onClose={() => setEditingPhoto(false)} onSaved={load} />}

      {adding && <AddPlace city={city} base={base} spot={spot} startOnFlight={city === "Voos"} onClose={() => setAdding(false)} onAdded={() => { flash("Lugar adicionado!"); load(); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function Gate() {
  return (
    <main className="wrap gate">
      <h1>Nossa Viagem <em>2026</em></h1>
      <p>Para entrar, abra o <b>seu link pessoal</b>, aquele que o organizador enviou por mensagem.</p>
      <p className="muted">Ainda não recebeu? Peça ao Bruno. Se você é o organizador e é a primeira vez, <a href="/admin">crie a lista da família</a>.</p>
    </main>
  );
}
