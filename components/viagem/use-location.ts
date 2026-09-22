"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type Spot = { lat: number; lng: number; accuracy: number };
export type LocationState = { spot: Spot | null; status: "idle" | "asking" | "on" | "denied" | "error" | "unsupported"; message: string };

const KEY = "viagem_geo_on";

// Localização do celular, com acompanhamento contínuo. Fica lembrada para reativar sozinha na próxima visita.
export function useMyLocation() {
  const [state, setState] = useState<LocationState>({ spot: null, status: "idle", message: "" });
  const watch = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    try { localStorage.removeItem(KEY); } catch { /* sem armazenamento */ }
    setState({ spot: null, status: "idle", message: "" });
  }, []);

  const start = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return setState({ spot: null, status: "unsupported", message: "Este aparelho não informa a localização." });
    setState((s) => ({ ...s, status: s.spot ? s.status : "asking", message: "" }));
    if (watch.current != null) return;
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        try { localStorage.setItem(KEY, "1"); } catch { /* sem armazenamento */ }
        setState({ spot: { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }, status: "on", message: "" });
      },
      (err) => {
        if (watch.current != null) { navigator.geolocation.clearWatch(watch.current); watch.current = null; }
        try { localStorage.removeItem(KEY); } catch { /* sem armazenamento */ }
        setState({
          spot: null,
          status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
          message: err.code === err.PERMISSION_DENIED ? "Permissão negada. Libere a localização nas configurações do navegador." : "Não consegui achar sua localização agora.",
        });
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
  }, []);

  useEffect(() => {
    let remembered = false;
    try { remembered = localStorage.getItem(KEY) === "1"; } catch { /* sem armazenamento */ }
    if (remembered) start();
    return () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); };
  }, [start]);

  return { ...state, start, stop };
}
