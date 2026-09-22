"use client";
import { useState } from "react";
import { Camera, Check, ExternalLink, Home, MapPin, Navigation, Pencil, RotateCcw, Star, Trash2 } from "lucide-react";
import { formatDistance } from "../../lib/geo";
import { CHOICE_LABEL, patch, score, type Choice, type Item, type Person, type State } from "../../lib/client";
import { Avatar } from "./avatar";
import { Directions } from "./directions";
import { FlightStrip } from "./flight-strip";
import { PhotoButton } from "./photo-button";
import { DocsBox } from "./docs-box";

export function PlaceCard({ item, state, rank, onVote, onOpen, onDelete, onChanged, distance, fromBase, focus, base, spot, onNeedLocation, onCheckIn, onEdit, onSeePhotos, onPhotosAdded, photoCount = 0, onChanged2, onOpenDoc }: { item: Item; state: State; rank: number; onVote: (c: Choice | null) => void; onOpen: () => void; onDelete: () => void; onChanged: () => void; distance?: number | null; fromBase?: number | null; focus?: boolean; base: Item | null; spot: { lat: number; lng: number } | null; onNeedLocation: () => void; onCheckIn: (visited: boolean) => void; onEdit: () => void; onSeePhotos: () => void; onPhotosAdded: (sent: number, errors: string[]) => void; photoCount?: number; onChanged2: () => void | Promise<void>; onOpenDoc: (d: import("../../lib/client").TripDoc) => void }) {
  const [open, setOpen] = useState(false), [broken, setBroken] = useState(false);
  const byId = new Map<string, Person>(state.people.map((p) => [p.id, p]));
  const mine = item.votes[state.me.id] as Choice | undefined;
  const missing = state.people.filter((p) => !item.votes[p.id]);
  const author = byId.get(item.createdBy);
  const canDelete = item.createdBy === state.me.id || state.me.isAdmin;
  const isFlight = item.kind === "flight", logistics = item.kind !== "place";
  const total = score(item.votes), visitor = item.visitedBy ? byId.get(item.visitedBy) : null;
  return (
    <article id={`item-${item.id}`} className={`card ${item.isNew ? "is-new" : ""} ${focus ? "is-focus" : ""} ${item.isBase ? "is-base" : ""} ${item.visitedBy ? "is-done" : ""}`}>
      {canDelete && <button className="card-del" aria-label={`Remover ${item.title}`} title="Remover" onClick={() => confirm(`Remover "${item.title}" da lista?`) && onDelete()}><Trash2 size={16} /></button>}
      {isFlight && item.flight ? (
        <button className="card-main flightcard" onClick={() => { setOpen(!open); if (item.isNew) onOpen(); }} aria-expanded={open}>
          <div className="grow">
            <div className="badges">
              {item.isNew && <span className="badge novo">NOVO!</span>}
              {item.visitedBy && <span className="badge done"><Check size={10} /> Voamos{visitor ? ` · ${visitor.name}` : ""}</span>}
              {photoCount > 0 && <span className="badge fotos"><Camera size={10} /> {photoCount} {photoCount === 1 ? "foto" : "fotos"}</span>}
            </div>
            <FlightStrip f={item.flight} />
          </div>
        </button>
      ) : (
      <button className="card-main" onClick={() => { setOpen(!open); if (item.isNew) onOpen(); }} aria-expanded={open}>
        {item.image && !broken ? <img src={item.image} alt="" loading="lazy" onError={() => setBroken(true)} /> : <div className="ph"><MapPin size={26} /></div>}
        <div className="grow">
          <div className="badges">
            {item.isNew && <span className="badge novo">NOVO!</span>}
            {rank > 0 && total > 0 && <span className="badge rank">#{rank}</span>}
            <span className="badge cat">{item.category}</span>
            {distance != null && <span className="badge dist"><Navigation size={10} /> {formatDistance(distance)} de você</span>}
            {fromBase != null && <span className="badge base-dist"><Home size={10} /> {formatDistance(fromBase)} da base</span>}
            {item.isBase && <span className="badge base"><Home size={10} /> Onde ficaremos</span>}
            {item.visitedBy && <span className="badge done"><Check size={10} /> Visitado{visitor ? ` · ${visitor.name}` : ""}</span>}
            {photoCount > 0 && <span className="badge fotos"><Camera size={10} /> {photoCount} {photoCount === 1 ? "foto" : "fotos"}</span>}
          </div>
          <h3>{item.title}</h3>
          <span className="meta">
            {item.rating ? <><Star size={13} fill="currentColor" /> {item.rating.toFixed(1)} · </> : null}{item.priceLevel ? `${item.priceLevel} · ` : ""}
            <Avatar p={author} size={16} /> {author?.name ?? "alguém"}
          </span>
        </div>
        {!logistics && <div className="pts" aria-label={`${total} pontos`}><b>{total}</b><small>pts</small></div>}
      </button>
      )}
      {open && (
        <div className="card-more">
          {item.note && <p>“{item.note}”</p>}
          {item.address && <p className="addr">{item.address}</p>}
          <div className="row">
            {item.mapUrl && <a href={item.mapUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir no Google Maps</a>}
            {canDelete && <button className="link" onClick={onEdit}><Pencil size={14} /> Editar</button>}
            {photoCount > 0 && <button className="link" onClick={onSeePhotos}><Camera size={14} /> Ver as fotos</button>}
            {state.me.isAdmin && (
              <button className="link" onClick={() => patch(`/api/suggestions/${item.id}`, { isBase: !item.isBase }).catch((e) => alert((e as Error).message)).then(onChanged)}>
                <Home size={14} /> {item.isBase ? "Não é mais a base" : `Marcar como base em ${item.city}`}
              </button>
            )}
          </div>
          {!logistics && <DocsBox item={item} state={state} onChanged={onChanged2} onOpen={onOpenDoc} defaultKind="documento" compact />}
        </div>
      )}
      {item.visitedBy ? (
        <div className="dirs">
          {photoCount > 0 && <button className="dir photos" onClick={onSeePhotos}><Camera size={13} /> {photoCount} {photoCount === 1 ? "foto" : "fotos"}</button>}
          <PhotoButton city={item.city} itemId={item.id} label="Enviar fotos daqui" className="dir photos" onDone={onPhotosAdded} />
          <button className="dir undo" onClick={() => onCheckIn(false)}><RotateCcw size={13} /> {isFlight ? "Ainda não voamos" : "Ainda não visitamos"}</button>
        </div>
      ) : (
        <>
          {!isFlight && <Directions item={item} base={base} spot={spot} onNeedLocation={onNeedLocation} />}
          <div className="dirs">
            <button className="dir checkin" onClick={() => onCheckIn(true)}><Check size={14} /> {isFlight ? "Já voamos" : "Já visitamos este lugar"}</button>
            {photoCount > 0 && <button className="dir photos" onClick={onSeePhotos}><Camera size={13} /> {photoCount} {photoCount === 1 ? "foto" : "fotos"}</button>}
            <PhotoButton city={item.city} itemId={item.id} label="Enviar fotos daqui" className="dir photos" onDone={onPhotosAdded} />
          </div>
        </>
      )}
      {logistics && <DocsBox item={item} state={state} onChanged={onChanged2} onOpen={onOpenDoc} defaultKind={isFlight ? "passagem" : "documento"} compact />}
      {!logistics && <label className="dayrow">Dia sugerido
        <input type="date" min="2026-11-19" value={item.visitDate ?? ""} onChange={(e) => patch(`/api/suggestions/${item.id}`, { visitDate: e.target.value || null }).catch(() => {}).then(onChanged)} />
      </label>}
      {!logistics && <div className="votes" role="group" aria-label="Seu voto">
        {(Object.keys(CHOICE_LABEL) as Choice[]).map((c) => (
          <button key={c} className={`vote v-${c} ${mine === c ? "on" : ""}`} aria-pressed={mine === c} onClick={() => onVote(mine === c ? null : c)}>{CHOICE_LABEL[c]}</button>
        ))}
      </div>}
      {!logistics && <div className="tally">
        {(Object.keys(CHOICE_LABEL) as Choice[]).map((c) => {
          const who = state.people.filter((p) => item.votes[p.id] === c);
          return who.length ? <span key={c} className={`grp v-${c}`}>{CHOICE_LABEL[c]} {who.map((p) => <Avatar key={p.id} p={p} size={20} />)}</span> : null;
        })}
        {missing.length > 0 && <span className="muted">Faltam: {missing.map((p) => p.name).join(", ")}</span>}
      </div>}
    </article>
  );
}
