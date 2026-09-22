"use client";
import { useMemo, useState } from "react";
import { CalendarDays, Check, LayoutList, MapPin } from "lucide-react";
import { WEEKDAYS, dayNumber, formatDay, formatWeek, monthKey, monthWeeks, weekStart } from "../../lib/dates";
import { CHOICE_LABEL, patch, score, type Choice, type Item, type State } from "../../lib/client";

const TRIP_START = "2026-11-19";
const CITY_CLASS: Record<string, string> = { Chicago: "c-chi", Dallas: "c-dal", Orlando: "c-orl" };

export function Agenda({ state, onChanged }: { state: State; onChanged: () => void | Promise<void> }) {
  const [view, setView] = useState<"lista" | "calendario">("lista");
  const [openDay, setOpenDay] = useState("");

  const dated = state.items.filter((i) => i.visitDate && !i.isBase);
  const undated = state.items.filter((i) => !i.visitDate && !i.isBase);
  const byScore = (a: Item, b: Item) => score(b.votes) - score(a.votes);
  const ofDay = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of dated) m.set(i.visitDate!, [...(m.get(i.visitDate!) ?? []), i]);
    for (const list of m.values()) list.sort(byScore);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.items]);

  const days = [...ofDay.keys()].sort();
  const months = [...new Set(days.map(monthKey))].sort();

  async function setDay(id: string, visitDate: string | null) {
    try { await patch(`/api/suggestions/${id}`, { visitDate }); } catch (e) { alert((e as Error).message); }
    await onChanged();
  }

  const Row = ({ i }: { i: Item }) => {
    const mine = i.votes[state.me.id] as Choice | undefined;
    return (
      <li className={`ag-row ${i.visitedBy ? "done" : ""}`}>
        <div className="grow">
          <strong>{i.visitedBy && <Check size={14} />} {i.title}</strong>
          <span className="meta"><span className={`badge city-${i.city}`}>{i.city}</span> {i.category} · {score(i.votes)} pts{mine ? ` · você: ${CHOICE_LABEL[mine]}` : ""}</span>
        </div>
        <input type="date" min={TRIP_START} value={i.visitDate ?? ""} aria-label={`Dia de ${i.title}`} onChange={(e) => setDay(i.id, e.target.value || null)} />
      </li>
    );
  };

  const DayBlock = ({ d }: { d: string }) => (
    <div className="ag-day">
      <h3>{formatDay(d)}</h3>
      <ul>{(ofDay.get(d) ?? []).map((i) => <Row key={i.id} i={i} />)}</ul>
    </div>
  );

  // Lista: os dias agrupados por semana, de segunda a domingo.
  const weeks = [...new Set(days.map(weekStart))].sort();

  return (
    <section>
      <div className="seg viewseg">
        <button className={view === "lista" ? "on" : ""} onClick={() => setView("lista")}><LayoutList size={15} /> Lista</button>
        <button className={view === "calendario" ? "on" : ""} onClick={() => setView("calendario")}><CalendarDays size={15} /> Calendário</button>
      </div>

      {days.length === 0 && <p className="empty"><CalendarDays size={28} /><br />Nada agendado ainda. Defina o dia de cada lugar aqui embaixo ou na lista de Lugares.</p>}

      {view === "lista" ? (
        weeks.map((w) => (
          <div className="ag-week" key={w}>
            <h2>Semana de {formatWeek(w)}</h2>
            {days.filter((d) => weekStart(d) === w).map((d) => <DayBlock key={d} d={d} />)}
          </div>
        ))
      ) : (
        <>
          {months.map((m) => (
            <div className="cal" key={m}>
              <h2>{new Date(m + "-01T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase())}</h2>
              <div className="cal-grid">
                {WEEKDAYS.map((w) => <span className="cal-wd" key={w}>{w}</span>)}
                {monthWeeks(m).flat().map((d) => {
                  // Dias das pontas pertencem a outro mês: aparecem apagados e sem marcação.
                  const out = monthKey(d) !== m, list = out ? [] : ofDay.get(d) ?? [];
                  return (
                    <button key={d} className={`cal-day ${out ? "out" : ""} ${list.length ? "has" : ""} ${openDay === d ? "on" : ""}`}
                      onClick={() => setOpenDay(openDay === d ? "" : d)} disabled={list.length === 0}
                      aria-label={`${formatDay(d)}, ${list.length} ${list.length === 1 ? "lugar" : "lugares"}`}>
                      <b>{dayNumber(d)}</b>
                      <span className="cal-dots">
                        {list.slice(0, 4).map((i) => <i key={i.id} className={`${CITY_CLASS[i.city] ?? ""} ${i.visitedBy ? "vis" : ""}`} />)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {openDay && monthKey(openDay) === m && ofDay.get(openDay) && <DayBlock d={openDay} />}
            </div>
          ))}
          {!openDay && days.length > 0 && <p className="muted center">Toque em um dia com marcação para ver o que está planejado.</p>}
        </>
      )}

      {undated.length > 0 && (
        <div className="ag-day ag-undated">
          <h3><MapPin size={16} /> Ainda sem dia <small>{undated.length}</small></h3>
          <ul>{[...undated].sort(byScore).map((i) => <Row key={i.id} i={i} />)}</ul>
        </div>
      )}
    </section>
  );
}
