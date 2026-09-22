"use client";
import { Check, Home, Navigation } from "lucide-react";
import { score, type Item } from "../../lib/client";
import { formatDistance } from "../../lib/geo";

// Ranking do destino: até 10 lugares ainda por visitar, com as duas distâncias e o check-in.
export function Priorities({ city, items, distanceOf, fromBase, onCheckIn, onOpen }: {
  city: string;
  items: Item[];
  distanceOf: (i: Item) => number | null;
  fromBase: (i: Item) => number | null;
  onCheckIn: (i: Item) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="top">
      <h2>Prioridades em {city}</h2>
      <ol className="pri">
        {items.map((i, n) => {
          const mine = distanceOf(i), base = fromBase(i);
          return (
            <li key={i.id}>
              <span className="pri-dist">
                {mine != null && <span title="distância de onde você está"><Navigation size={10} /> {formatDistance(mine)}</span>}
                {base != null && <span title="distância da base"><Home size={10} /> {formatDistance(base)}</span>}
              </span>
              <button className="pri-name" onClick={() => onOpen(i.id)}>
                <b>{n + 1}. {i.title}</b> <span>{score(i.votes)} pts</span>
              </button>
              <button className="pri-check" onClick={() => onCheckIn(i)} aria-label={`Marcar ${i.title} como visitado`} title="Já visitamos">
                <Check size={17} />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
