import { describe, expect, it } from "vitest";
import { addDays, formatWeek, monthWeeks, validDate, weekStart } from "../lib/dates";

describe("datas da agenda", () => {
  it("acha a segunda-feira da semana", () => {
    expect(weekStart("2026-11-19")).toBe("2026-11-16"); // quinta -> segunda
    expect(weekStart("2026-11-16")).toBe("2026-11-16"); // já é segunda
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // domingo fecha a semana
  });
  it("anda no calendário atravessando meses", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-01", -1)).toBe("2026-11-30");
  });
  it("escreve a semana em português", () => {
    expect(formatWeek("2026-11-16")).toBe("16 a 22 de novembro");
    expect(formatWeek("2026-11-30")).toBe("30 de novembro a 6 de dezembro");
  });
  it("monta o mês em semanas de segunda a domingo", () => {
    const w = monthWeeks("2026-11");
    expect(w[0][0]).toBe("2026-10-26");
    expect(w[0]).toHaveLength(7);
    expect(w[w.length - 1]).toContain("2026-11-30");
  });
  it("aceita só datas reais da viagem", () => {
    expect(validDate("2026-12-03")).toBe(true);
    expect(validDate("2026-13-01")).toBe(false);
  });
});
