"use client";
import { CalendarDays, MapPin } from "lucide-react";
import { formatDay } from "../../lib/dates";
import { CHOICE_LABEL, patch, score, type Choice, type Item, type State } from "../../lib/client";

const TRIP_START = "2026-11-19";

export function Agenda({ state, onChanged }: { state: State; onChanged: () => void | Promise<void> }) {
  const dated = state.items.filter((i) => i.visitDate && !i.isBase), undated = state.items.filter((i) => !i.visitDate && !i.isBase);
  const days = [...new Set(dated.map((i) => i.visitDate!))].sort();
  const byScore = (a: Item, b: Item) => score(b.votes) - score(a.votes);

  async function setDay(id: string, visitDate: string | null) {
    try { await patch(`/api/suggestions/${id}`, { visitDate }); } catch (e) { alert((e as Error).message); }
    await onChanged();
  }

  const Row = ({ i }: { i: Item }) => {
    const mine = i.votes[state.me.id] as Choice | undefined;
    return (
      <li className="ag-row">
        <div className="grow">
          <strong>{i.title}</strong>
          <span className="meta"><span className={`badge city-${i.city}`}>{i.city}</span> {i.category} · {score(i.votes)} pts{mine ? ` · você: ${CHOICE_LABEL[mine]}` : ""}</span>
        </div>
        <input type="date" min={TRIP_START} value={i.visitDate ?? ""} aria-label={`Dia de ${i.title}`} onChange={(e) => setDay(i.id, e.target.value || null)} />
      </li>
    );
  };

  return (
    <section>
      {days.length === 0 && <p className="empty"><CalendarDays size={28} /><br />Nada agendado ainda. Defina o dia de cada lugar aqui embaixo ou na lista de Lugares.</p>}
      {days.map((d) => (
        <div className="ag-day" key={d}>
          <h3>{formatDay(d)}</h3>
          <ul>{dated.filter((i) => i.visitDate === d).sort(byScore).map((i) => <Row key={i.id} i={i} />)}</ul>
        </div>
      ))}
      {undated.length > 0 && (
        <div className="ag-day ag-undated">
          <h3><MapPin size={16} /> Ainda sem dia <small>{undated.length}</small></h3>
          <ul>{undated.sort(byScore).map((i) => <Row key={i.id} i={i} />)}</ul>
        </div>
      )}
    </section>
  );
}
