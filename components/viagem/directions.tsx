"use client";
import { Car, Footprints, Home, Navigation, TrainFront } from "lucide-react";
import { directionsUrl, travelMode, type Item, type TravelMode } from "../../lib/client";
import { distanceMeters } from "../../lib/geo";

const ModeIcon = ({ mode }: { mode: TravelMode }) => (mode === "walking" ? <Footprints size={13} /> : mode === "transit" ? <TrainFront size={13} /> : <Car size={13} />);
const LABEL: Record<TravelMode, string> = { walking: "a pé", transit: "de transporte público", driving: "de carro" };

// Abre o Google Maps já com o trajeto montado; lá dá para trocar o meio de transporte.
export function Directions({ item, base, spot, onNeedLocation }: { item: Item; base: Item | null; spot: { lat: number; lng: number } | null; onNeedLocation: () => void }) {
  const from = base && base.id !== item.id && base.lat != null && base.lng != null ? { lat: base.lat, lng: base.lng } : null;
  if (!from && !spot) return null;
  const at = item.lat != null && item.lng != null ? { lat: item.lat, lng: item.lng } : null;
  const mode = (o: { lat: number; lng: number }) => travelMode(item.city, at ? distanceMeters(o, at) : null);

  return (
    <div className="dirs">
      {from && (
        <a className="dir" href={directionsUrl(from, item, mode(from))} target="_blank" rel="noreferrer" title={`Da base até ${item.title}, ${LABEL[mode(from)]}`}>
          <Home size={13} /> Da base <ModeIcon mode={mode(from)} />
        </a>
      )}
      {spot ? (
        <a className="dir" href={directionsUrl(spot, item, mode(spot))} target="_blank" rel="noreferrer" title={`De onde estou até ${item.title}, ${LABEL[mode(spot)]}`}>
          <Navigation size={13} /> De onde estou <ModeIcon mode={mode(spot)} />
        </a>
      ) : (
        <button className="dir" onClick={onNeedLocation} title="Preciso da sua localização para traçar o caminho"><Navigation size={13} /> De onde estou</button>
      )}
    </div>
  );
}
