import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ALL_RECIPES,
  canonicalNames,
  parseIngredient,
  recipesFor,
  type PantryProfile,
  type Recipe,
} from "@/lib/engine";

export const Route = createFileRoute("/dev/checks")({
  head: () => ({
    meta: [
      { title: "Engine Checks — Thyme" },
      { name: "description", content: "Development checks for the Thyme matching engine." },
      { property: "og:title", content: "Engine Checks — Thyme" },
      { property: "og:description", content: "Development checks for the Thyme matching engine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DevChecksPage,
});

interface CheckResult {
  name: string;
  pass: boolean;
  detail?: string;
}

function mk(
  id: number,
  title: string,
  ingredients: string[],
  servings = 2,
): Recipe {
  return {
    id,
    title,
    category: "main",
    cuisine: "test",
    prep_time_minutes: 5,
    cook_time_minutes: 10,
    servings,
    difficulty: "easy",
    ingredients,
    instructions: ["step 1"],
    tags: [],
  };
}

function profile(overrides: Partial<PantryProfile> = {}): PantryProfile {
  return {
    restrictions: [],
    also_avoid: null,
    likes: null,
    dislikes: null,
    cuisines: null,
    budget: 50,
    ...overrides,
  };
}

function shownIds(r: ReturnType<typeof recipesFor>): Set<number> {
  return new Set([
    ...r.nothingToBuy.map((t) => t.recipe.id),
    ...r.justAFewThings.map((t) => t.recipe.id),
    ...r.closestMatches.map((m) => m.recipe.id),
  ]);
}

function runChecks(): { checks: CheckResult[]; unmatched: string[] } {
  const checks: CheckResult[] = [];

  // ---- Restriction filters ----
  const pantryRice = ["rice"];

  const peanut = recipesFor(
    profile({ restrictions: ["peanut"] }),
    pantryRice,
    2,
    [mk(1, "PB Noodles", ["2 tbsp peanut butter", "1 cup rice"]), mk(2, "Plain Rice", ["1 cup rice"])],
  );
  const peanutShown = shownIds(peanut);
  checks.push({
    name: "peanut filter",
    pass: !peanutShown.has(1) && peanutShown.has(2),
    detail: "peanut recipe hidden, safe recipe shown",
  });

  const vegan = recipesFor(
    profile({ restrictions: ["vegan"] }),
    pantryRice,
    2,
    [
      mk(1, "Butter Rice", ["1 cup rice", "1 tbsp butter"]),
      mk(2, "Egg Rice", ["1 cup rice", "2 eggs"]),
      mk(3, "Honey Bowl", ["1 cup rice", "1 tbsp honey"]),
      mk(4, "Veg Bowl", ["1 cup rice", "1 cup broccoli"]),
    ],
  );
  const veganShown = shownIds(vegan);
  checks.push({
    name: "vegan filter",
    pass: !veganShown.has(1) && !veganShown.has(2) && !veganShown.has(3) && veganShown.has(4),
    detail: "butter, egg, and honey recipes hidden",
  });

  const vegetarian = recipesFor(
    profile({ restrictions: ["vegetarian"] }),
    pantryRice,
    2,
    [
      mk(1, "Chicken Rice", ["1 cup rice", "1 chicken breast"]),
      mk(2, "Beef Bowl", ["1 cup rice", "1/2 lb ground beef"]),
      mk(3, "Mushroom Risotto", ["1 cup rice", "1 cup mushrooms", "1 tbsp butter"]),
    ],
  );
  const vegShown = shownIds(vegetarian);
  checks.push({
    name: "vegetarian filter",
    pass: !vegShown.has(1) && !vegShown.has(2) && vegShown.has(3),
  });

  const glutenFree = recipesFor(
    profile({ restrictions: ["gluten free"] }),
    pantryRice,
    2,
    [mk(1, "Pasta Night", ["8 oz pasta"]), mk(2, "Rice Bowl", ["1 cup rice"])],
  );
  const gfShown = shownIds(glutenFree);
  checks.push({
    name: "gluten free filter",
    pass: !gfShown.has(1) && gfShown.has(2),
  });

  const dairyFree = recipesFor(
    profile({ restrictions: ["dairy free"] }),
    pantryRice,
    2,
    [mk(1, "Creamy Rice", ["1 cup rice", "1 cup heavy cream"]), mk(2, "Rice Bowl", ["1 cup rice"])],
  );
  const dfShown = shownIds(dairyFree);
  checks.push({
    name: "dairy free filter",
    pass: !dfShown.has(1) && dfShown.has(2),
  });

  const halal = recipesFor(
    profile({ restrictions: ["halal"] }),
    pantryRice,
    2,
    [
      mk(1, "Bacon Rice", ["4 slices bacon", "1 cup rice"]),
      mk(2, "Wine Sauce", ["1 cup rice", "1/2 cup white wine"]),
      mk(3, "Simple Rice", ["1 cup rice"]),
    ],
  );
  const halalShown = shownIds(halal);
  checks.push({
    name: "halal filter",
    pass: !halalShown.has(1) && !halalShown.has(2) && halalShown.has(3),
  });

  const avoid = recipesFor(
    profile({ also_avoid: "mushroom" }),
    pantryRice,
    2,
    [mk(1, "Risotto", ["1 cup rice", "1 cup mushrooms"]), mk(2, "Plain", ["1 cup rice"])],
  );
  const avoidShown = shownIds(avoid);
  checks.push({
    name: "'also avoid' filtering",
    pass: !avoidShown.has(1) && avoidShown.has(2),
  });

  const disliked = recipesFor(
    profile({ dislikes: "cilantro" }),
    pantryRice,
    2,
    [mk(1, "Salsa Rice", ["1 cup rice", "1/2 cup fresh cilantro"]), mk(2, "Plain", ["1 cup rice"])],
  );
  const disShown = shownIds(disliked);
  checks.push({
    name: "dislikes filtering",
    pass: !disShown.has(1) && disShown.has(2),
  });

  // ---- Alias + parsing ----
  checks.push({
    name: 'alias match ("green onion" matches "scallion")',
    pass: parseIngredient("green onion") === "scallion",
    detail: `got: ${parseIngredient("green onion")}`,
  });

  checks.push({
    name: 'parseIngredient "2 cups all-purpose flour"',
    pass: parseIngredient("2 cups all-purpose flour") === "all-purpose flour",
    detail: `got: ${parseIngredient("2 cups all-purpose flour")}`,
  });
  checks.push({
    name: 'parseIngredient "1/2 tsp salt"',
    pass: parseIngredient("1/2 tsp salt") === "salt",
    detail: `got: ${parseIngredient("1/2 tsp salt")}`,
  });
  checks.push({
    name: 'parseIngredient "3 cloves garlic, minced"',
    pass: parseIngredient("3 cloves garlic, minced") === "garlic",
    detail: `got: ${parseIngredient("3 cloves garlic, minced")}`,
  });

  // ---- Staples ----
  const staplesOk = recipesFor(profile(), [], 2).justAFewThings.every((t) =>
    t.need.every((n) => !["salt", "pepper", "black pepper", "water", "cooking oil"].includes(n)),
  );
  checks.push({
    name: "staples never appear in need",
    pass: staplesOk,
  });

  // ---- Cost scaling ----
  const costRecipe = [mk(1, "Soup", ["1 can crushed tomatoes", "1 cup water"])];
  const cost2 = recipesFor(profile(), [], 2, costRecipe).justAFewThings[0]?.estimated_cost ?? -1;
  const cost4 = recipesFor(profile(), [], 4, costRecipe).justAFewThings[0]?.estimated_cost ?? -1;
  checks.push({
    name: "cost doubles when servings double",
    pass: cost2 > 0 && Math.abs(cost4 - cost2 * 2) < 0.005,
    detail: `servings 2: $${cost2.toFixed(2)}, servings 4: $${cost4.toFixed(2)}`,
  });

  // ---- Budget ----
  const zeroBudget = recipesFor(profile({ budget: 0 }), [], 2);
  checks.push({
    name: "$0 budget empties 'Just a Few Things'",
    pass: zeroBudget.justAFewThings.length === 0,
    detail: `count: ${zeroBudget.justAFewThings.length}`,
  });

  // ---- Tier boundaries ----
  const pantryB = ["rice", "eggs", "onion", "garlic", "bread"];
  const boundary = recipesFor(
    profile(),
    pantryB,
    2,
    [
      mk(1, "Zero missing", ["1 cup rice", "2 eggs"]),
      mk(2, "Three missing", ["1 cup rice", "1 cup milk", "1 tbsp butter", "1 lime"]),
      mk(3, "Four missing", ["1 cup rice", "1 cup milk", "1 tbsp butter", "1 cup parmesan cheese", "1 lime"]),
    ],
  );
  const nothingIds = new Set(boundary.nothingToBuy.map((t) => t.recipe.id));
  const fewIds = new Set(boundary.justAFewThings.map((t) => t.recipe.id));
  checks.push({
    name: "tier boundaries (0 / 3 / 4 missing items)",
    pass: nothingIds.has(1) && fewIds.has(2) && !fewIds.has(3) && !nothingIds.has(3),
    detail: "0 → Nothing to Buy, 3 → Just a Few Things, 4 → neither",
  });

  // ---- Data integrity ----
  const unmatched: string[] = [];
  for (const recipe of ALL_RECIPES) {
    for (const raw of recipe.ingredients) {
      const parsed = parseIngredient(raw);
      if (!canonicalNames.has(parsed)) {
        unmatched.push(`"${raw}" → "${parsed}" (${recipe.title})`);
      }
    }
  }
  checks.push({
    name: "every recipe ingredient maps to a canonical item",
    pass: unmatched.length === 0,
    detail: unmatched.length > 0 ? `${unmatched.length} unmatched` : "all mapped",
  });

  const ids = ALL_RECIPES.map((r) => r.id);
  checks.push({
    name: "no duplicate recipe ids",
    pass: new Set(ids).size === ids.length,
  });

  return { checks, unmatched };
}

function DevChecksPage() {
  const { checks, unmatched } = useMemo(() => runChecks(), []);
  const passCount = checks.filter((c) => c.pass).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold" style={{ color: "var(--gold)" }}>
        Engine Checks
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {passCount} / {checks.length} passing
      </p>

      <div
        className="mt-6 divide-y rounded-2xl p-2 shadow-md"
        style={{ background: "var(--card)", color: "var(--card-foreground)", borderColor: "var(--parchment-dark)" }}
      >
        {checks.map((c) => (
          <div key={c.name} className="flex items-start gap-3 px-4 py-3" style={{ borderColor: "var(--parchment-dark)" }}>
            <span
              aria-hidden
              className="mt-0.5 font-bold"
              style={{ color: c.pass ? "var(--moss)" : "var(--destructive)" }}
            >
              {c.pass ? "PASS" : "FAIL"}
            </span>
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              {c.detail && <p className="text-xs text-ink/60">{c.detail}</p>}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-2xl font-semibold" style={{ color: "var(--parchment)" }}>
        Unmatched ingredient strings
      </h2>
      {unmatched.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">None — every ingredient maps cleanly.</p>
      ) : (
        <ul className="mt-2 list-disc pl-5 text-sm" style={{ color: "var(--parchment)" }}>
          {unmatched.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
