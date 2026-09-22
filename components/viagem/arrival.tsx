"use client";
import { PlaneLanding } from "lucide-react";
import type { State, TripDoc } from "../../lib/client";
import { cityOfAirport } from "../../lib/flights";
import { formatDay } from "../../lib/dates";
import { FlightStrip } from "./flight-strip";
import { DocsBox } from "./docs-box";

// "Como chegaremos": o voo que pousa neste destino, com as passagens de quem está vendo.
export function ArrivalBox({ state, city, onChanged, onOpenDoc }: { state: State; city: string; onChanged: () => void | Promise<void>; onOpenDoc: (d: TripDoc) => void }) {
  const flights = state.items
    .filter((i) => i.kind === "flight" && i.flight && cityOfAirport(i.flight.to) === city)
    .sort((a, b) => (a.flight!.departDate + a.flight!.departTime).localeCompare(b.flight!.departDate + b.flight!.departTime));
  if (flights.length === 0) return null;

  return (
    <aside className="arrivalbox">
      <h2><PlaneLanding size={15} /> Como chegaremos</h2>
      {flights.map((f) => (
        <div className="arrival-one" key={f.id}>
          <span className="muted">{formatDay(f.flight!.departDate)}</span>
          <FlightStrip f={f.flight!} />
          <DocsBox item={f} state={state} onChanged={onChanged} onOpen={onOpenDoc} defaultKind="passagem" compact />
        </div>
      ))}
    </aside>
  );
}
