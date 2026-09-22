"use client";
import { Plane } from "lucide-react";
import { flightMinutes, formatDuration, type FlightInfo } from "../../lib/flights";

// Trajeto do voo no estilo dos e-mails de companhia aérea: origem, linha com o avião, destino.
export function FlightStrip({ f, compact = false }: { f: FlightInfo; compact?: boolean }) {
  const min = flightMinutes(f);
  const nextDay = f.arriveDate > f.departDate;
  return (
    <div className={`fstrip ${compact ? "compact" : ""}`}>
      <div className="fs-head">
        <span className="fs-num"><Plane size={13} /> {f.number}</span>
        {f.airline && <span className="fs-air">{f.airline}</span>}
        {min != null && <span className="fs-dur">{formatDuration(min)}</span>}
      </div>
      <div className="fs-body">
        <div className="fs-side">
          <b>{f.departTime}</b>
          <span className="fs-code">{f.from.code}</span>
          <span className="fs-city">{f.from.city || f.from.name}</span>
          {!compact && f.terminalFrom && <span className="fs-term">Terminal {f.terminalFrom}</span>}
        </div>
        <div className="fs-line" aria-hidden="true">
          <i className="fs-dot" />
          <i className="fs-bar" />
          <Plane size={16} className="fs-plane" />
          <i className="fs-bar" />
          <i className="fs-dot" />
        </div>
        <div className="fs-side end">
          <b>{f.arriveTime}{nextDay && <sup>+1</sup>}</b>
          <span className="fs-code">{f.to.code}</span>
          <span className="fs-city">{f.to.city || f.to.name}</span>
          {!compact && f.terminalTo && <span className="fs-term">Terminal {f.terminalTo}</span>}
        </div>
      </div>
      {!compact && f.source === "aerodatabox" && (
        <a className="fs-credit" href="https://www.aerodatabox.com/" target="_blank" rel="noreferrer">Dados do voo: AeroDataBox</a>
      )}
    </div>
  );
}
