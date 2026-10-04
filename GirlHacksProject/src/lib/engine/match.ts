import { ALL_RECIPES, canonicalsByAlias, DEFAULT_PRICE, PRICE_BY_CANONICAL, STAPLES } from "./data";
import { normalize, parseIngredient, parseIngredientLine } from "./parse";
import { inferRestrictions } from "./restrictions";
import type {
  ClosestMatch,
  EmptyReason,
  PantryProfile,
  Recipe,
  RecipeItem,
  SearchResults,
  ShoppingItem,
  TierResult,
} from "./types";

/** Maps a profile restriction checkbox to the engine flag that violates it. */
const RESTRICTION_FLAG: Record<string, string> = {
  vegetarian: "not vegetarian",
  vegan: "not vegan",
  halal: "not halal",
  "gluten free": "gluten",
  "dairy free": "dairy",
  peanut: "peanut",
  "tree nut": "tree nut",
  egg: "egg",
  shellfish: "shellfish",
  soy: "soy",
  fish: "fish",
};

/**
 * A generic pantry word covers the specific items recipes ask for:
 * "cheese" covers cheddar/parmesan/mozzarella, "chicken" covers chicken breast, etc.
 */
const GENERIC_COVERS: Record<string, (canonical: string) => boolean> = {
  cheese: (c) =>
    /cheese|mozzarella|cheddar|parmesan|pecorino|gruyere|feta|cotija|ricotta|pepper jack|gouda|brie|halloumi|paneer/.test(
      c,
    ),
  onion: (c) => /^(?:red )?onion$/.test(c),
  chicken: (c) => /^(?:whole |cooked )?chicken(?! broth| stock| noodle)/.test(c),
  beef: (c) => /^(?:ground )?beef(?! broth| stock)/.test(c),
  pork: (c) => /^pork/.test(c),
  tomato: (c) => /^(?:cherry )?tomato$/.test(c),
  potato: (c) => /^(?:yukon gold )?potato$/.test(c),
  "bell pepper": (c) => /^(?:(?:red|green) )?bell pepper$/.test(c),
  pasta: (c) => c === "pasta" || c === "spaghetti",
  spaghetti: (c) => c === "pasta" || c === "spaghetti",
};

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitTerms(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/[,;\n]/)
    .map((t) => t.toLowerCase().trim())
    .filter((t) => t.length >= 2);
}

/** Whole-word (plural tolerant) matchers for a disliked / avoided term and its canonical form. */
function avoidMatchers(term: string): RegExp[] {
  const forms = new Set([term, normalize(term)]);
  return [...forms].map((f) => new RegExp(`\\b${esc(f)}(?:s|es)?\\b`));
}

function priceOf(canonical: string): number {
  if (STAPLES.has(canonical)) return 0;
  return PRICE_BY_CANONICAL.get(canonical) ?? DEFAULT_PRICE;
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

interface ParsedRecipe {
  /** Per raw line: requirement groups, each a list of acceptable alternatives. */
  lines: string[][][];
  canonicals: string[];
  flags: string[];
  rawLower: string[];
}

const parsedCache = new WeakMap<Recipe, ParsedRecipe>();

function parseRecipe(r: Recipe): ParsedRecipe {
  const hit = parsedCache.get(r);
  if (hit) return hit;
  const lines = r.ingredients.map((raw) => parseIngredientLine(raw));
  const canonicals = [...new Set(lines.flat(2))];
  // Check restrictions against BOTH the raw text and every alternative, so
  // "butter or oil" counts as butter and nothing slips through a bad parse.
  const flags = inferRestrictions([...r.ingredients, ...canonicals]);
  const parsed = { lines, canonicals, flags, rawLower: r.ingredients.map((s) => s.toLowerCase()) };
  parsedCache.set(r, parsed);
  return parsed;
}

export function recipesFor(
  profile: PantryProfile,
  pantry: string[],
  servings: number,
  recipes: Recipe[] = ALL_RECIPES,
): SearchResults {
  const normalizedPantry = pantry
    .flatMap((p) => {
      const exactAlias = p.toLowerCase().trim();
      const ambiguousCanonicals = canonicalsByAlias.get(exactAlias);
      return ambiguousCanonicals && ambiguousCanonicals.length > 1
        ? ambiguousCanonicals
        : [parseIngredient(p)];
    })
    .filter(Boolean);
  const pantrySet = new Set(normalizedPantry);
  const generics = normalizedPantry.filter((p) => p in GENERIC_COVERS);
  console.log("[thyme] normalized pantry:", normalizedPantry, "| servings:", servings);

  const isOwned = (c: string): boolean =>
    STAPLES.has(c) || pantrySet.has(c) || generics.some((g) => GENERIC_COVERS[g]?.(c) ?? false);

  const avoid = [...splitTerms(profile.also_avoid), ...splitTerms(profile.dislikes)].map(
    avoidMatchers,
  );
  const likedCuisines = splitTerms(profile.cuisines);
  const likedFoods = splitTerms(profile.likes).map(avoidMatchers);

  const totalBeforeFilter = recipes.length;
  const passing = recipes.filter((r) => {
    const p = parseRecipe(r);
    if (profile.restrictions.some((res) => p.flags.includes(RESTRICTION_FLAG[res] ?? res))) {
      return false;
    }
    const hitsAvoid = avoid.some((matchers) =>
      matchers.some(
        (re) => p.rawLower.some((l) => re.test(l)) || p.canonicals.some((c) => re.test(c)),
      ),
    );
    return !hitsAvoid;
  });
  const totalAfterFilter = passing.length;
  console.log(
    `[thyme] recipes before filter: ${totalBeforeFilter}, after filter: ${totalAfterFilter}`,
  );

  const scored: TierResult[] = passing.map((r) => {
    const p = parseRecipe(r);
    const have = new Set<string>();
    const need = new Set<string>();

    const items: RecipeItem[] = r.ingredients.map((raw, i) => {
      const groups = p.lines[i] ?? [];
      let allOwned = true;
      for (const alts of groups) {
        const ownedAlt = alts.find(isOwned);
        if (ownedAlt) {
          have.add(ownedAlt);
        } else {
          allOwned = false;
          // Missing: ask the shopper to buy the cheapest acceptable alternative.
          const cheapest = [...alts].sort((a, b) => priceOf(a) - priceOf(b))[0];
          if (cheapest) need.add(cheapest);
        }
      }
      return {
        raw,
        canonical: groups[0]?.[0] ?? raw,
        alternatives: groups[0] ?? [],
        owned: allOwned,
      };
    });

    const needList = [...need];
    // est_price is per serving, so the cost for N servings is price * N.
    const estimated_cost = roundCents(needList.reduce((sum, c) => sum + priceOf(c), 0) * servings);
    // Staples are free for everyone, so they don't count as "using your pantry".
    const pantry_matches = [...have].filter((c) => !STAPLES.has(c) || pantrySet.has(c)).length;
    return { recipe: r, items, need: needList, have: [...have], pantry_matches, estimated_cost };
  });

  // A recipe that uses nothing the user actually has is not a "cook what you have"
  // result, however cheap it is (this is what put lemonade first for a rice pantry).
  const relevant =
    normalizedPantry.length > 0 ? scored.filter((s) => s.pantry_matches > 0) : scored;

  const likedHits = (s: TierResult): number =>
    likedFoods.filter((ms) =>
      ms.some((re) => s.recipe.ingredients.some((l) => re.test(l.toLowerCase()))),
    ).length;

  const isLiked = (cuisine: string): boolean => {
    const c = cuisine.toLowerCase();
    return likedCuisines.some((l) => c === l || c.includes(l) || l.includes(c));
  };
  // Order: uses more of YOUR pantry, then cheapest, then liked foods, then liked cuisine.
  const byCost = (a: TierResult, b: TierResult) => {
    if (a.pantry_matches !== b.pantry_matches) return b.pantry_matches - a.pantry_matches;
    if (a.estimated_cost !== b.estimated_cost) return a.estimated_cost - b.estimated_cost;
    if (likedHits(a) !== likedHits(b)) return likedHits(b) - likedHits(a);
    return (isLiked(a.recipe.cuisine) ? 0 : 1) - (isLiked(b.recipe.cuisine) ? 0 : 1);
  };

  // Budget is the total for the meal at the chosen serving size.
  const budget = profile.budget ?? Infinity;
  const nothingToBuy = relevant
    .filter((s) => s.need.length === 0)
    .sort(byCost)
    .slice(0, 5);
  const fewCandidates = relevant.filter((s) => s.need.length >= 1 && s.need.length <= 3);
  const justAFewThings = fewCandidates
    .filter((s) => s.estimated_cost <= budget)
    .sort(byCost)
    .slice(0, 5);
  console.log(
    `[thyme] tier counts — nothingToBuy: ${nothingToBuy.length}, justAFewThings: ${justAFewThings.length}`,
  );

  let fewEmptyReason: EmptyReason = "none";
  if (justAFewThings.length === 0) {
    fewEmptyReason =
      relevant.length === 0 ? "no-matches" : fewCandidates.length > 0 ? "budget" : "count";
  }

  // Combined, deduplicated shopping list across the recipes shown (price for N servings).
  const seen = new Map<string, ShoppingItem>();
  for (const tier of [...nothingToBuy, ...justAFewThings]) {
    for (const name of tier.need) {
      if (!seen.has(name))
        seen.set(name, { name, est_price: roundCents(priceOf(name) * servings) });
    }
  }
  const shoppingList = [...seen.values()];
  const shoppingTotal = roundCents(shoppingList.reduce((s, i) => s + i.est_price, 0));

  // Fallback: fewest missing items, budget ignored, never repeating a recipe already shown.
  const shownIds = new Set([...nothingToBuy, ...justAFewThings].map((t) => t.recipe.id));
  const closestMatches: ClosestMatch[] = relevant
    .filter((s) => s.need.length > 0 && !shownIds.has(s.recipe.id))
    .sort((a, b) => a.need.length - b.need.length || byCost(a, b))
    .slice(0, 3)
    .map((s) => {
      const reasons: string[] = [];
      if (s.estimated_cost > budget) reasons.push("over budget");
      if (s.need.length > 3) reasons.push("over 3 items");
      return {
        recipe: s.recipe,
        missingCount: s.need.length,
        estimated_cost: s.estimated_cost,
        reasons,
        tier: s,
      };
    });

  return {
    nothingToBuy,
    justAFewThings,
    shoppingList,
    shoppingTotal,
    closestMatches,
    totalBeforeFilter,
    totalAfterFilter,
    fewEmptyReason,
  };
}
