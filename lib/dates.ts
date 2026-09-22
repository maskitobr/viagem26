export function validDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && v >= "2026-01-01" && v <= "2027-12-31";
}

export function formatDay(v: string): string {
  const s = new Date(v + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Datas são sempre "YYYY-MM-DD" e viram Date ao meio-dia local, para nenhum fuso mudar o dia.
const at = (v: string) => new Date(v + "T12:00:00");
export const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function addDays(v: string, n: number): string {
  const d = at(v);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

// Segunda-feira da semana de uma data.
export function weekStart(v: string): string {
  const d = at(v), day = d.getDay(); // 0 = domingo
  return addDays(v, day === 0 ? -6 : 1 - day);
}

export const dayNumber = (v: string) => at(v).getDate();
export const monthKey = (v: string) => v.slice(0, 7);

export function formatMonth(key: string): string {
  const s = at(key + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "16 a 22 de novembro" ou "30 de novembro a 6 de dezembro"
export function formatWeek(start: string): string {
  const end = addDays(start, 6), a = at(start), b = at(end);
  const month = (d: Date) => d.toLocaleDateString("pt-BR", { month: "long" });
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} a ${b.getDate()} de ${month(b)}`
    : `${a.getDate()} de ${month(a)} a ${b.getDate()} de ${month(b)}`;
}

// Semanas (segunda a domingo) que cobrem o mês inteiro, com os dias vizinhos completando as pontas.
export function monthWeeks(key: string): string[][] {
  const first = key + "-01", last = toKey(new Date(at(first).getFullYear(), at(first).getMonth() + 1, 0));
  const weeks: string[][] = [];
  for (let start = weekStart(first); start <= weekStart(last); start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

export const WEEKDAYS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
