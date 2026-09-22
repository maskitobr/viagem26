export const CHOICES = { quero: 2, talvez: 1, passo: 0 } as const;
export type Choice = keyof typeof CHOICES;
export const CITIES = ["Chicago", "Dallas", "Orlando", "Voos"] as const;
export type City = (typeof CITIES)[number];

export const isChoice = (v: unknown): v is Choice => typeof v === "string" && v in CHOICES;
export const isCity = (v: unknown): v is City => typeof v === "string" && (CITIES as readonly string[]).includes(v);

export function score(votes: Record<string, string>): number {
  return Object.values(votes).reduce((sum, c) => sum + (isChoice(c) ? CHOICES[c] : 0), 0);
}

export function rank<T extends { votes: Record<string, string>; createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => score(b.votes) - score(a.votes) || Object.keys(b.votes).length - Object.keys(a.votes).length || a.createdAt.localeCompare(b.createdAt));
}

// "NOVO!": item criado por outra pessoa que ainda não foi aberto/votado por quem está vendo.
export function isNewFor(item: { createdBy: string; id: string }, personId: string, seen: ReadonlySet<string>): boolean {
  return item.createdBy !== personId && !seen.has(item.id);
}
