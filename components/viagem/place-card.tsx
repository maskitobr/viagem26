"use client";
import { useState } from "react";
import { ExternalLink, MapPin, Star, Trash2 } from "lucide-react";
import { CHOICE_LABEL, score, type Choice, type Item, type Person, type State } from "../../lib/client";
import { Avatar } from "./avatar";

export function PlaceCard({ item, state, rank, onVote, onOpen, onDelete }: { item: Item; state: State; rank: number; onVote: (c: Choice | null) => void; onOpen: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const byId = new Map<string, Person>(state.people.map((p) => [p.id, p]));
  const mine = item.votes[state.me.id] as Choice | undefined;
  const missing = state.people.filter((p) => !item.votes[p.id]);
  const author = byId.get(item.createdBy);
  const canDelete = item.createdBy === state.me.id || state.me.isAdmin;
  const total = score(item.votes);
  return (
    <article className={`card ${item.isNew ? "is-new" : ""}`}>
      <button className="card-main" onClick={() => { setOpen(!open); if (item.isNew) onOpen(); }} aria-expanded={open}>
        {item.image ? <img src={item.image} alt="" loading="lazy" /> : <div className="ph"><MapPin size={26} /></div>}
        <div className="grow">
          <div className="badges">
            {item.isNew && <span className="badge novo">NOVO!</span>}
            {rank > 0 && total > 0 && <span className="badge rank">#{rank}</span>}
            <span className="badge cat">{item.category}</span>
          </div>
          <h3>{item.title}</h3>
          <span className="meta">
            {item.rating ? <><Star size={13} fill="currentColor" /> {item.rating.toFixed(1)} · </> : null}{item.priceLevel ? `${item.priceLevel} · ` : ""}
            <Avatar p={author} size={16} /> {author?.name ?? "alguém"}
          </span>
        </div>
        <div className="pts" aria-label={`${total} pontos`}><b>{total}</b><small>pts</small></div>
      </button>
      {open && (
        <div className="card-more">
          {item.note && <p>“{item.note}”</p>}
          {item.address && <p className="addr">{item.address}</p>}
          <div className="row">
            {item.mapUrl && <a href={item.mapUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir no Google Maps</a>}
            {canDelete && <button className="link danger" onClick={() => confirm(`Remover "${item.title}"?`) && onDelete()}><Trash2 size={14} /> Remover</button>}
          </div>
        </div>
      )}
      <div className="votes" role="group" aria-label="Seu voto">
        {(Object.keys(CHOICE_LABEL) as Choice[]).map((c) => (
          <button key={c} className={`vote v-${c} ${mine === c ? "on" : ""}`} aria-pressed={mine === c} onClick={() => onVote(mine === c ? null : c)}>{CHOICE_LABEL[c]}</button>
        ))}
      </div>
      <div className="tally">
        {(Object.keys(CHOICE_LABEL) as Choice[]).map((c) => {
          const who = state.people.filter((p) => item.votes[p.id] === c);
          return who.length ? <span key={c} className={`grp v-${c}`}>{CHOICE_LABEL[c]} {who.map((p) => <Avatar key={p.id} p={p} size={20} />)}</span> : null;
        })}
        {missing.length > 0 && <span className="muted">Faltam: {missing.map((p) => p.name).join(", ")}</span>}
      </div>
    </article>
  );
}
