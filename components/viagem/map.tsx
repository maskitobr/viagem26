"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap, LayerGroup } from "leaflet";
import { Crosshair, LocateFixed, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { CITIES, score, type Item, type State } from "../../lib/client";
import { distanceMeters, formatDistance } from "../../lib/geo";
import type { LocationState } from "./use-location";

const CENTERS: Record<string, [number, number]> = { Chicago: [41.8781, -87.6298], Dallas: [32.7767, -96.797], Orlando: [28.5383, -81.3792] };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const pinColor = (n: number) => (n >= 4 ? "#2f9e63" : n >= 2 ? "#ffc94d" : n > 0 ? "#ec5f43" : "#8a97a3");

export function TripMap({ state, city, setCity, location, onOpenItem }: { state: State; city: string; setCity: (c: string) => void; location: LocationState & { start: () => void }; onOpenItem: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null), map = useRef<LMap | null>(null), pins = useRef<LayerGroup | null>(null), mePin = useRef<LayerGroup | null>(null);
  const [all, setAll] = useState(false), [ready, setReady] = useState(false);
  const shown = state.items.filter((i) => (all || i.city === city) && i.lat != null && i.lng != null);
  const missing = state.items.filter((i) => (all || i.city === city) && i.lat == null).length;
  const spot = location.spot;
  const bases = new Map(state.items.filter((i) => i.isBase && i.lat != null).map((i) => [i.city, i]));

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = await import("leaflet");
      if (dead || !box.current || map.current) return;
      const m = L.map(box.current, { zoomControl: false, attributionControl: true }).setView(CENTERS[city] ?? CENTERS.Chicago, 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
      L.control.zoom({ position: "bottomright" }).addTo(m);
      pins.current = L.layerGroup().addTo(m);
      mePin.current = L.layerGroup().addTo(m);
      map.current = m;
      setReady(true);
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; setReady(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marcadores dos lugares
  useEffect(() => {
    if (!ready || !map.current || !pins.current) return;
    let dead = false;
    (async () => {
      const L = await import("leaflet");
      if (dead || !pins.current) return;
      pins.current.clearLayers();
      for (const i of shown) {
        const pts = score(i.votes), dist = spot ? distanceMeters(spot, { lat: i.lat!, lng: i.lng! }) : null;
        const b = bases.get(i.city);
        const toBase = b && b.id !== i.id ? distanceMeters({ lat: b.lat!, lng: b.lng! }, { lat: i.lat!, lng: i.lng! }) : null;
        const icon = i.isBase
          ? L.divIcon({ className: "pin-wrap", html: '<span class="pin pin-base"><b>\u2302</b></span>', iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -32] })
          : L.divIcon({ className: "pin-wrap", html: `<span class="pin" style="background:${pinColor(pts)}"><b>${pts || ""}</b></span>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });
        L.marker([i.lat!, i.lng!], { icon, title: i.title, zIndexOffset: i.isBase ? 500 : 0 })
          .bindPopup(`<strong>${esc(i.title)}</strong>${i.isBase ? ' <span class="pop-base">onde ficaremos</span>' : ""}<br><span class="pop-meta">${esc(i.city)} · ${esc(i.category)} · ${pts} pts${dist != null ? ` · a ${formatDistance(dist)} de você` : ""}${toBase != null ? ` · a ${formatDistance(toBase)} da base` : ""}</span><br><button class="pop-btn" data-item="${i.id}">Ver na lista</button>${i.mapUrl ? ` <a class="pop-btn alt" href="${esc(i.mapUrl)}" target="_blank" rel="noreferrer">Google Maps</a>` : ""}`)
          .addTo(pins.current);
      }
      const bounds: [number, number][] = shown.map((i) => [i.lat!, i.lng!]);
      if (spot) bounds.push([spot.lat, spot.lng]);
      if (bounds.length > 1) map.current!.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      else if (bounds.length === 1) map.current!.setView(bounds[0], 14);
      else map.current!.setView(CENTERS[city] ?? CENTERS.Chicago, 12);
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, all, city, state.items, spot?.lat, spot?.lng]);

  // Marcador de "você está aqui"
  useEffect(() => {
    if (!ready || !mePin.current) return;
    let dead = false;
    (async () => {
      const L = await import("leaflet");
      if (dead || !mePin.current) return;
      mePin.current.clearLayers();
      if (!spot) return;
      L.marker([spot.lat, spot.lng], { icon: L.divIcon({ className: "me-wrap", html: '<span class="me-dot"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }), zIndexOffset: 1000 })
        .bindPopup("Você está aqui").addTo(mePin.current);
      if (spot.accuracy > 60) L.circle([spot.lat, spot.lng], { radius: spot.accuracy, color: "#2b7fb8", weight: 1, fillOpacity: 0.08 }).addTo(mePin.current);
    })();
    return () => { dead = true; };
  }, [ready, spot]);

  // "Ver na lista" dentro do balão
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>("[data-item]")?.dataset.item;
      if (id) onOpenItem(id);
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [onOpenItem]);

  const nearest = spot && shown.length ? shown.map((i) => ({ i, d: distanceMeters(spot, { lat: i.lat!, lng: i.lng! }) })).sort((a, b) => a.d - b.d)[0] : null;

  return (
    <section>
      <div className="map-bar">
        {CITIES.map((c) => <button key={c} className={!all && c === city ? "on" : ""} onClick={() => { setAll(false); setCity(c); }}>{c}</button>)}
        <button className={all ? "on" : ""} onClick={() => setAll(true)}>Todos</button>
        <button className="locate" onClick={() => (spot ? map.current?.setView([spot.lat, spot.lng], 16) : location.start())}>
          {spot ? <><Crosshair size={15} /> Onde estou</> : <><LocateFixed size={15} /> Usar minha localização</>}
        </button>
      </div>
      {location.message && <p className="notice" role="alert">{location.message}</p>}
      <div className="map" ref={box} role="application" aria-label="Mapa das atrações" />
      <p className="muted map-note">
        {nearest ? <><MapPin size={14} /> Mais perto de você: <b>{nearest.i.title}</b>, a {formatDistance(nearest.d)}.</> : shown.length === 0 ? "Nenhum lugar com localização por aqui ainda." : "Ative a localização para ver a que distância você está de cada lugar."}
        {missing > 0 && ` ${missing} ${missing === 1 ? "lugar ainda sem coordenada" : "lugares ainda sem coordenada"}.`}
      </p>
    </section>
  );
}
