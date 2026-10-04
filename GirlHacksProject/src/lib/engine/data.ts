import ingredientsJson from "@/data/ingredients.json";
import extraJson from "@/data/ingredients.extra.json";
import recipesJson from "@/data/recipes.json";
import type { IngredientInfo, Recipe } from "./types";

const base = (ingredientsJson as { ingredients: IngredientInfo[] }).ingredients;
const extra = (extraJson as { ingredients: IngredientInfo[] }).ingredients;

const baseNames = new Set(base.map((i) => i.name.toLowerCase()));
/** ingredients.json plus ingredients.extra.json (extras never override base entries). */
export const INGREDIENTS: IngredientInfo[] = [
  ...base,
  ...extra.filter((i) => !baseNames.has(i.name.toLowerCase())),
];

export const RECIPES_FILE = recipesJson as unknown as {
  title: string;
  total_recipes: number;
  categories?: Record<string, number>;
  recipes: Recipe[];
};
export const ALL_RECIPES: Recipe[] = RECIPES_FILE.recipes;

/** Extra spellings that must resolve to an existing canonical name. */
const ALIAS_OVERRIDES: Record<string, string> = {
  oil: "cooking oil",
  "vegetable oil": "cooking oil",
  "high-heat oil": "cooking oil",
  "oil for frying": "cooking oil",
  "frying oil": "cooking oil",
};

/** Canonical names plus every alias, all lowercase. */
const LOOKUP_KEYS: string[] = [];
export const aliasToCanonical = new Map<string, string>();
export const canonicalsByAlias = new Map<string, string[]>();

for (const ing of INGREDIENTS) {
  for (const key of [ing.name, ...ing.aliases]) {
    const k = key.toLowerCase().trim();
    LOOKUP_KEYS.push(k);
    const canonicals = canonicalsByAlias.get(k) ?? [];
    if (!canonicals.includes(ing.name)) canonicals.push(ing.name);
    canonicalsByAlias.set(k, canonicals);
    if (!aliasToCanonical.has(k)) aliasToCanonical.set(k, ing.name);
  }
  aliasToCanonical.set(ing.name.toLowerCase(), ing.name);
}
for (const [alias, canonical] of Object.entries(ALIAS_OVERRIDES)) {
  LOOKUP_KEYS.push(alias);
  aliasToCanonical.set(alias, canonical);
}

export const canonicalNames = new Set(INGREDIENTS.map((i) => i.name));

export const PRICE_BY_CANONICAL = new Map<string, number>(
  INGREDIENTS.map((i) => [i.name, i.est_price]),
);

/** Used when an ingredient has no price, so unknown items never look free. */
export const DEFAULT_PRICE = 0.5;

export const LOOKUP_KEYS_BY_LENGTH = [...new Set(LOOKUP_KEYS)].sort((a, b) => b.length - a.length);

/** Staples are always treated as owned and never appear in a shopping list. */
export const STAPLES = new Set([
  "salt",
  "pepper",
  "black pepper",
  "water",
  "cooking oil",
  "olive oil",
  "canola oil",
  "cooking spray",
  "ice cubes",
]);
