"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, MapPin, Plus, Sparkles } from "lucide-react";
import { ApiError, CITIES, api, post, score, type Choice, type State } from "../../lib/client";
import { Avatar } from "./avatar";
import { AddPlace } from "./add-place";
import { PhotoWall } from "./photos";
import { PlaceCard } from "./place-card";

const TRIP = new Date("2026-11-19T00:00:00-03:00");

export function App() {
  const [state, setState] = useState<State | null>(null), [error, setError] = useState<string | null>(null), [denied, setDenied] = useState(false);
  const [city, setCity] = useState<string>(CITIES[0]), [tab, setTab] = useState<"lugares" | "fotos">("lugares"), [adding, setAdding] = useState(false), [toast, setToast] = useState("");

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

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const days = Math.max(0, Math.ceil((TRIP.getTime() - Date.now()) / 86400000));

  const items = useMemo(() => (state?.items ?? []).filter((i) => i.city === city).sort((a, b) => score(b.votes) - score(a.votes) || Object.keys(b.votes).length - Object.keys(a.votes).length || a.createdAt.localeCompare(b.createdAt)), [state, city]);
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
  async function remove(id: string) {
    try { await api(`/api/suggestions/${id}`, { method: "DELETE" }); flash("Item removido."); } catch (e) { flash((e as Error).message); }
    load();
  }

  if (denied) return <Gate />;
  if (!state) return <main className="wrap"><p className="muted center">{error ?? "Carregando a viagem…"}</p></main>;

  const myNew = newBy(city), allNew = state.items.filter((i) => i.isNew);
  const newAuthors = [...new Set(myNew.map((i) => state.people.find((p) => p.id === i.createdBy)?.name).filter(Boolean))];
  const top = items.filter((i) => score(i.votes) > 0).slice(0, 3);

  return (
    <main className="wrap">
      <header className="hero">
        <div>
          <p className="eyebrow">GRU → Chicago → Dallas → Orlando</p>
          <h1>Nossa Viagem <em>2026</em></h1>
          <p className="count"><b>{days}</b> dias para embarcar</p>
        </div>
        <div className="me"><Avatar p={state.me} size={36} /><span>{state.me.name}</span>{state.me.isAdmin && <a href="/admin">Admin</a>}</div>
      </header>

      {error && <p className="notice" role="alert">{error}</p>}

      <nav className="tabs" aria-label="Seções">
        <button className={tab === "lugares" ? "on" : ""} onClick={() => setTab("lugares")}><MapPin size={16} /> Lugares{allNew.length > 0 && <i className="dot">{allNew.length}</i>}</button>
        <button className={tab === "fotos" ? "on" : ""} onClick={() => setTab("fotos")}><Camera size={16} /> Fotos</button>
      </nav>

      <div className="cities" role="tablist">
        {CITIES.map((c) => (
          <button key={c} role="tab" aria-selected={city === c} className={city === c ? "on" : ""} onClick={() => setCity(c)}>
            {c}{tab === "lugares" && newBy(c).length > 0 && <i className="dot">{newBy(c).length}</i>}
          </button>
        ))}
      </div>

      {tab === "lugares" ? (
        <section>
          {myNew.length > 0 && <div className="banner"><Sparkles size={18} /> <span><b>{myNew.length} {myNew.length === 1 ? "item novo" : "itens novos"}</b> em {city} para você avaliar{newAuthors.length ? ` (de ${newAuthors.join(", ")})` : ""}.</span></div>}
          {top.length > 0 && (
            <div className="top"><h2>Prioridades em {city}</h2><ol>{top.map((i) => <li key={i.id}><b>{i.title}</b> <span>{score(i.votes)} pts</span></li>)}</ol></div>
          )}
          <button className="primary wide" onClick={() => setAdding(true)}><Plus size={18} /> Adicionar lugar em {city}</button>
          {items.length === 0 ? <p className="empty">Nenhum lugar em {city} ainda. Busque um restaurante ou passeio e adicione!</p> : (
            <div className="list">{items.map((i, idx) => <PlaceCard key={i.id} item={i} state={state} rank={idx + 1} onVote={(c) => vote(i.id, c)} onOpen={() => seen(i.id)} onDelete={() => remove(i.id)} />)}</div>
          )}
        </section>
      ) : <PhotoWall state={state} city={city} onChanged={load} />}

      {adding && <AddPlace city={city} onClose={() => setAdding(false)} onAdded={() => { flash("Lugar adicionado!"); load(); }} />}
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
