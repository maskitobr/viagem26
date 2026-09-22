import { describe, expect, it } from "vitest";
import { airportTitle, cityOfAirport, flightMinutes, formatDuration, normalizeFlight, normalizeNumber, parseFlightTime } from "../lib/flights";

const raw = {
  number: "LA 8180",
  airline: { name: "LATAM" },
  aircraft: { model: "Boeing 777" },
  departure: { airport: { iata: "GRU", shortName: "Guarulhos", municipalityName: "São Paulo", location: { lat: -23.43, lon: -46.47 }, timeZone: "America/Sao_Paulo" }, scheduledTime: { local: "2026-11-19 22:05-03:00", utc: "2026-11-20 01:05Z" }, terminal: "3" },
  arrival: { airport: { iata: "ORD", shortName: "O'Hare", municipalityName: "Chicago", location: { lat: 41.97, lon: -87.9 }, timeZone: "America/Chicago" }, scheduledTime: { local: "2026-11-20 05:30-06:00" }, terminal: "5" },
};

describe("voos", () => {
  it("lê o horário local com fuso", () => {
    expect(parseFlightTime("2026-11-19 22:05-03:00")).toMatchObject({ date: "2026-11-19", time: "22:05", iso: "2026-11-20T01:05:00.000Z" });
    expect(parseFlightTime("2026-11-20 05:30Z")?.iso).toBe("2026-11-20T05:30:00.000Z");
    expect(parseFlightTime("amanhã cedo")).toBeNull();
  });

  it("monta o voo a partir da resposta da API", () => {
    const f = normalizeFlight(raw)!;
    expect(f).toMatchObject({ number: "LA 8180", airline: "LATAM", departDate: "2026-11-19", departTime: "22:05", arriveTime: "05:30", terminalFrom: "3" });
    expect(f.from.code).toBe("GRU");
    expect(f.to.city).toBe("Chicago");
    expect(formatDuration(flightMinutes(f)!)).toBe("10h 25min");
  });

  it("recusa respostas incompletas", () => expect(normalizeFlight({ number: "X1" })).toBeNull());

  it("põe o aeroporto na aba do destino mais próximo", () => {
    expect(cityOfAirport({ code: "ORD", name: "", city: "Chicago", lat: 41.97, lng: -87.9, timeZone: null })).toBe("Chicago");
    expect(cityOfAirport({ code: "GRU", name: "", city: "São Paulo", lat: -23.43, lng: -46.47, timeZone: null })).toBe("Voos");
    expect(cityOfAirport({ code: "XXX", name: "", city: "", lat: null, lng: null, timeZone: null })).toBe("Voos");
  });

  it("normaliza o número e nomeia o aeroporto", () => {
    expect(normalizeNumber("la 8180")).toBe("LA8180");
    expect(airportTitle({ code: "MCO", name: "Orlando Intl", city: "Orlando", lat: null, lng: null, timeZone: null })).toBe("Aeroporto MCO · Orlando");
  });
});
