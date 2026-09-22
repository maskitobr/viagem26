"use client";
import { Check, ExternalLink, MapPin, Star } from "lucide-react";
import type { Item, Photo, State } from "../../lib/client";
import { formatDay } from "../../lib/dates";
import { PhotoButton } from "./photo-button";
import { FlightStrip } from "./flight-strip";

// Álbum de um lugar: à esquerda o que o Google conta sobre ele, à direita as nossas fotos.
export function Album({ place, photos, state, onOpen, onPhotosAdded }: {
  place: Item | null;
  photos: Photo[];
  state: State;
  onOpen: (p: Photo) => void;
  onPhotosAdded: (sent: number, errors: string[]) => void;
}) {
  const who = (id: string) => state.people.find((p) => p.id === id)?.name ?? "";
  const visitor = place?.visitedBy ? who(place.visitedBy) : null;

  const wall = (
    <div className="wall">
      {photos.map((p) => (
        <button key={p.id} onClick={() => onOpen(p)} aria-label={`Ver foto de ${who(p.personId)}`}>
          <img src={p.url} alt={`Foto de ${who(p.personId)}${place ? ` em ${place.title}` : ""}`} loading="lazy" />
        </button>
      ))}
    </div>
  );

  if (!place) {
    return (
      <section className="album loose-album">
        <h3 className="wall-title">Sem lugar definido <small>{photos.length}</small></h3>
        {wall}
      </section>
    );
  }

  return (
    <section className="album">
      <aside className="album-info">
        {place.kind === "flight" && place.flight ? <FlightStrip f={place.flight} compact /> : (
          <>
            {place.image && <img className="album-img" src={place.image} alt={place.title} loading="lazy" />}
            <h3>{place.title}</h3>
            <span className="meta">
              {place.category}
              {place.rating ? <> · <Star size={12} fill="currentColor" /> {place.rating.toFixed(1)}</> : null}
              {place.priceLevel ? ` · ${place.priceLevel}` : ""}
            </span>
          </>
        )}
        {place.summary && <p className="album-sum">{place.summary}</p>}
        {place.note && <p className="album-note">“{place.note}”</p>}
        {place.address && <span className="addr"><MapPin size={11} /> {place.address}</span>}
        {place.visitedBy && <span className="badge done"><Check size={10} /> Visitado{visitor ? ` · ${visitor}` : ""}{place.visitDate ? ` · ${formatDay(place.visitDate)}` : ""}</span>}
        <div className="album-acts">
          {place.mapUrl && <a className="link" href={place.mapUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Google Maps</a>}
          <PhotoButton city={place.city} itemId={place.id} label="Enviar fotos" className="dir photos" onDone={onPhotosAdded} />
        </div>
      </aside>
      <div className="album-photos">
        <h4>{photos.length} {photos.length === 1 ? "foto nossa" : "fotos nossas"}</h4>
        {wall}
      </div>
    </section>
  );
}
