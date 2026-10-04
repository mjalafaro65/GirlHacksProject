import { INGREDIENTS } from "@/lib/engine";

export interface Suggestion {
  /** Canonical ingredient name to add as a chip. */
  name: string;
  /** Alias the user typed, shown as "green onion → scallion". */
  alias?: string;
}

function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (/(ss|us|is)$/.test(word)) return word;
  if (/ies$/.test(word)) return word.slice(0, -3) + "y";
  if (/(ches|shes|xes|ses|zes|oes)$/.test(word)) return word.slice(0, -2);
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

/**
 * Rank ingredients for the pantry autocomplete:
 * starts-with, then word-starts-with, then contains, then alias matches.
 * Max 8 suggestions.
 */
export function suggestIngredients(query: string, exclude: Set<string>): Suggestion[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const startsWith: Suggestion[] = [];
  const wordStartsWith: Suggestion[] = [];
  const contains: Suggestion[] = [];
  const aliasMatches: Suggestion[] = [];

  for (const ing of INGREDIENTS) {
    if (exclude.has(ing.name)) continue;
    const name = ing.name.toLowerCase();
    if (name.startsWith(q)) {
      startsWith.push({ name: ing.name });
      continue;
    }
    if (new RegExp(`\\b${escapeRe(q)}`).test(name)) {
      wordStartsWith.push({ name: ing.name });
      continue;
    }
    if (name.includes(q)) {
      contains.push({ name: ing.name });
      continue;
    }
    const qSing = singularize(q);
    const alias = ing.aliases.find(
      (a) =>
        a.toLowerCase().startsWith(q) ||
        a.toLowerCase() === qSing ||
        a.toLowerCase() === q ||
        a.toLowerCase().split(" ").some((w) => w.startsWith(qSing) && qSing.length > 2),
    );
    if (alias) {
      aliasMatches.push({ name: ing.name, alias });
    }
  }

  return [...startsWith, ...wordStartsWith, ...contains, ...aliasMatches].slice(0, 8);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
