"use client";
import { useState } from "react";
import { Plane, Search } from "lucide-react";
import { ApiError, api, post } from "../../lib/client";
import type { FlightInfo } from "../../lib/flights";
import { FlightStrip } from "./flight-strip";

const TRIP_START = "2026-11-01";
const empty = { number: "", airline: "", fromCode: "", fromCity: "", toCode: "", toCity: "", departDate: "", departTime: "", arriveDate: "", arriveTime: "" };

// Cadastro de voo: pelo número (dados vêm prontos) ou preenchendo à mão.
export function AddFlight({ onSaved, onMessage }: { onSaved: () => void; onMessage: (m: string) => void }) {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [number, setNumber] = useState(""), [date, setDate] = useState("");
  const [found, setFound] = useState<FlightInfo[] | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState("");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(""); setFound(null);
    try {
      const r = await api<FlightInfo[]>(`/api/flights/lookup?number=${encodeURIComponent(number)}&date=${date}`);
      setFound(r);
      if (r.length === 0) setMsg("Não encontrei esse voo nessa data. Confira o número e o dia, ou preencha à mão.");
    } catch (e) {
      if (e instanceof ApiError && e.code === "not_configured") { setMode("manual"); setForm({ ...empty, number, departDate: date }); }
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  async function save(flight: Partial<FlightInfo>) {
    setBusy(true); setMsg("");
    try { await post("/api/flights", flight); onMessage("Voo adicionado!"); onSaved(); }
    catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  const saveManual = (e: React.FormEvent) => {
    e.preventDefault();
    save({
      number: form.number, airline: form.airline || null,
      from: { code: form.fromCode.toUpperCase(), name: "", city: form.fromCity, lat: null, lng: null, timeZone: null },
      to: { code: form.toCode.toUpperCase(), name: "", city: form.toCity, lat: null, lng: null, timeZone: null },
      departDate: form.departDate, departTime: form.departTime,
      arriveDate: form.arriveDate || form.departDate, arriveTime: form.arriveTime,
    });
  };

  return (
    <>
      <div className="seg">
        <button className={mode === "auto" ? "on" : ""} onClick={() => setMode("auto")}>Pelo número</button>
        <button className={mode === "manual" ? "on" : ""} onClick={() => setMode("manual")}>À mão</button>
      </div>
      {msg && <p className="notice" role="alert">{msg}</p>}

      {mode === "auto" ? (
        <>
          <form className="flightsearch" onSubmit={search}>
            <label>Número do voo<input required value={number} onChange={(e) => setNumber(e.target.value)} placeholder="LA8180" maxLength={12} /></label>
            <label>Data da partida<input required type="date" min={TRIP_START} value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <button className="primary" disabled={busy || !number.trim() || !date}><Search size={16} /> {busy ? "Buscando…" : "Buscar voo"}</button>
          </form>
          {found?.map((f, n) => (
            <div className="foundflight" key={n}>
              <FlightStrip f={f} />
              <button className="primary" disabled={busy} onClick={() => save(f)}><Plane size={16} /> Adicionar este voo</button>
            </div>
          ))}
        </>
      ) : (
        <form className="manual" onSubmit={saveManual}>
          <div className="two">
            <label>Número do voo<input required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="LA8180" maxLength={12} /></label>
            <label>Companhia<input value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} placeholder="LATAM" maxLength={60} /></label>
          </div>
          <div className="two">
            <label>Origem (código)<input required value={form.fromCode} onChange={(e) => setForm({ ...form, fromCode: e.target.value })} placeholder="GRU" maxLength={4} /></label>
            <label>Cidade de origem<input value={form.fromCity} onChange={(e) => setForm({ ...form, fromCity: e.target.value })} placeholder="São Paulo" maxLength={60} /></label>
          </div>
          <div className="two">
            <label>Destino (código)<input required value={form.toCode} onChange={(e) => setForm({ ...form, toCode: e.target.value })} placeholder="ORD" maxLength={4} /></label>
            <label>Cidade de destino<input value={form.toCity} onChange={(e) => setForm({ ...form, toCity: e.target.value })} placeholder="Chicago" maxLength={60} /></label>
          </div>
          <div className="two">
            <label>Partida<input required type="date" min={TRIP_START} value={form.departDate} onChange={(e) => setForm({ ...form, departDate: e.target.value })} /></label>
            <label>Hora da partida<input required type="time" value={form.departTime} onChange={(e) => setForm({ ...form, departTime: e.target.value })} /></label>
          </div>
          <div className="two">
            <label>Chegada (se for outro dia)<input type="date" min={form.departDate || TRIP_START} value={form.arriveDate} onChange={(e) => setForm({ ...form, arriveDate: e.target.value })} /></label>
            <label>Hora da chegada<input required type="time" value={form.arriveTime} onChange={(e) => setForm({ ...form, arriveTime: e.target.value })} /></label>
          </div>
          <button className="primary" disabled={busy}>{busy ? "Salvando…" : "Adicionar voo"}</button>
        </form>
      )}
    </>
  );
}
