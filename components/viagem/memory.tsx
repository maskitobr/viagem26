"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LMap } from "leaflet";
import { Camera, MapPin, Route } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { formatDay } from "../../lib/dates";
import { distanceMeters, formatDistance } from "../../lib/geo";
import type { Item, Photo, State } from "../../lib/client";
import { Avatar } from "./avatar";
import { FlightStrip } from "./flight-strip";
import { Lightbox } from "./lightbox";

// O diário usa a hora do destino, então as lembranças ficam certas mesmo lendo do Brasil.
const ZONE: Record<string, string> = { Chicago: "America/Chicago", Dallas: "America/Chicago", Orlando: "America/New_York" };
const dayOf = (iso: string, city: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: ZONE[city] ?? "America/Chicago" });
const timeOf = (iso: string, city: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: ZONE[city] ?? "America/Chicago" });
const hasGeo = (i: { lat: number | null; lng: number | null }) => i.lat != null && i.lng != null;

type Day = { date: string; stops: Item[]; photos: Photo[]; cities: string[]; meters: number };

export function buildDays(state: State): Day[] {
  const byDate = new Map<string, Day>();
  const day = (d: string) => {
    let x = byDate.get(d);
    if (!x) { x = { date: d, stops: [], photos: [], cities: [], meters: 0 }; byDate.set(d, x); }
    return x;
  };
  for (const i of state.items) if (i.visitedAt) day(dayOf(i.visitedAt, i.city)).stops.push(i);
  for (const p of state.photos) day(dayOf(p.takenAt ?? p.createdAt, p.city)).photos.push(p);

  return [...byDate.values()].map((d) => {
    d.stops.sort((a, b) => a.visitedAt!.localeCompare(b.visitedAt!));
    d.photos.sort((a, b) => (a.takenAt ?? a.createdAt).localeCompare(b.takenAt ?? b.createdAt));
    d.cities = [...new Set([...d.stops.map((s) => s.city), ...d.photos.map((p) => p.city)])];
    const pts = d.stops.filter(hasGeo);
    d.meters = pts.slice(1).reduce((sum, s, n) => sum + distanceMeters({ lat: pts[n].lat!, lng: pts[n].lng! }, { lat: s.lat!, lng: s.lng! }), 0);
    return d;
  }).sort((a, b) => b.date.localeCompare(a.date));
}

// Mapa do dia: as paradas na ordem em que aconteceram, ligadas pelo caminho percorrido.
function DayMap({ stops }: { stops: Item[] }) {
  const box = useRef<HTMLDivElement>(null), map = useRef<LMap | null>(null);
  const [visible, setVisible] = useState(false);
  const pts = stops.filter(hasGeo);

  useEffect(() => {
    const el = box.current;
    if (!el || visible) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && setVisible(true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !box.current || map.current || pts.length === 0) return;
    let dead = false;
    (async () => {
      const L = await import("leaflet");
      if (dead || !box.current || map.current) return;
      const m = L.map(box.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
      const line: [number, number][] = pts.map((s) => [s.lat!, s.lng!]);
      if (line.length > 1) L.polyline(line, { color: "#ec5f43", weight: 4, opacity: 0.85, dashArray: "1 8", lineCap: "round" }).addTo(m);
      pts.forEach((s, n) => {
        L.marker([s.lat!, s.lng!], { icon: L.divIcon({ className: "pin-wrap", html: `<span class="pin pin-step"><b>${n + 1}</b></span>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] }), title: s.title })
          .bindPopup(`<strong>${s.title.replace(/[&<>]/g, "")}</strong>`).addTo(m);
      });
      if (line.length > 1) m.fitBounds(line, { padding: [30, 30], maxZoom: 16 });
      else m.setView(line[0], 15);
      map.current = m;
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, stops]);

  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);
  if (pts.length === 0) return null;
  return <div className="daymap" ref={box} aria-label="Mapa do dia" />;
}

export function Memory({ state, onRemovePhoto }: { state: State; onRemovePhoto: (p: Photo) => void }) {
  const days = useMemo(() => buildDays(state), [state]);
  const [view, setView] = useState<Photo | null>(null);
  const person = (id: string) => state.people.find((p) => p.id === id);

  if (days.length === 0) {
    return (
      <section>
        <p className="empty"><Route size={30} /><br />A memória da viagem começa no primeiro check-in.<br />
          <span className="muted">Marque um lugar como visitado e envie fotos: o dia aparece aqui, com o trajeto e tudo o que fizeram.</span></p>
      </section>
    );
  }

  const stops = days.reduce((n, d) => n + d.stops.length, 0);
  const photos = days.reduce((n, d) => n + d.photos.length, 0);
  const meters = days.reduce((n, d) => n + d.meters, 0);

  return (
    <section className="memory">
      <div className="mem-stats">
        <div><b>{days.length}</b><span>{days.length === 1 ? "dia" : "dias"}</span></div>
        <div><b>{stops}</b><span>{stops === 1 ? "parada" : "paradas"}</span></div>
        <div><b>{photos}</b><span>fotos</span></div>
        <div><b>{formatDistance(meters).split(" ")[0]}</b><span>{formatDistance(meters).split(" ")[1]} percorridos</span></div>
      </div>

      {days.map((d) => {
        const stopIds = new Set(d.stops.map((s) => s.id));
        // Fotos de um lugar que não foi parada deste dia continuam agrupadas pelo lugar.
        const others = d.photos.filter((p) => !p.itemId || !stopIds.has(p.itemId));
        const byPlace = new Map<string, Photo[]>();
        const loose: Photo[] = [];
        for (const p of others) {
          const place = p.itemId ? state.items.find((i) => i.id === p.itemId) : null;
          if (place) byPlace.set(place.id, [...(byPlace.get(place.id) ?? []), p]);
          else loose.push(p);
        }
        return (
          <article className="mem-day" key={d.date}>
            <header>
              <h3>{formatDay(d.date)}</h3>
              <p className="muted">{[d.cities.join(" · "), `${d.stops.length} ${d.stops.length === 1 ? "parada" : "paradas"}`, d.meters > 0 ? formatDistance(d.meters) : null, `${d.photos.length} fotos`].filter(Boolean).join(" · ")}</p>
            </header>

            <DayMap stops={d.stops} />

            <ol className="steps">
              {d.stops.map((s, n) => {
                const mine = d.photos.filter((p) => p.itemId === s.id);
                const prev = d.stops.slice(0, n).reverse().find(hasGeo);
                const leg = prev && hasGeo(s) ? distanceMeters({ lat: prev.lat!, lng: prev.lng! }, { lat: s.lat!, lng: s.lng! }) : null;
                const who = s.visitedBy ? person(s.visitedBy) : undefined;
                return (
                  <li key={s.id}>
                    <span className="step-n">{n + 1}</span>
                    <div className="grow">
                      {leg != null && <span className="leg"><MapPin size={11} /> {formatDistance(leg)} desde a parada anterior</span>}
                      {s.kind === "flight" && s.flight ? <FlightStrip f={s.flight} compact /> : <strong>{s.title}</strong>}
                      <span className="meta">{timeOf(s.visitedAt!, s.city)} · {s.category} · <Avatar p={who} size={16} /> {who?.name ?? "alguém"}</span>
                      {s.note && <span className="muted">“{s.note}”</span>}
                      {mine.length > 0 && (
                        <div className="strip">{mine.map((p) => <button key={p.id} onClick={() => setView(p)}><img src={p.url} alt="" loading="lazy" /></button>)}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {[...byPlace.entries()].map(([id, list]) => {
              const place = state.items.find((i) => i.id === id)!;
              return (
                <div className="loose" key={id}>
                  <h4><Camera size={14} /> {place.title} <span className="muted">· {list.length} {list.length === 1 ? "foto" : "fotos"}</span></h4>
                  <div className="strip">{list.map((p) => <button key={p.id} onClick={() => setView(p)}><img src={p.url} alt="" loading="lazy" /></button>)}</div>
                </div>
              );
            })}

            {loose.length > 0 && (
              <div className="loose">
                <h4><Camera size={14} /> Outras fotos do dia</h4>
                <div className="strip">{loose.map((p) => <button key={p.id} onClick={() => setView(p)}><img src={p.url} alt="" loading="lazy" /></button>)}</div>
              </div>
            )}
          </article>
        );
      })}

      {view && <Lightbox photo={view} state={state} onClose={() => setView(null)} onRemove={onRemovePhoto} />}
    </section>
  );
}
