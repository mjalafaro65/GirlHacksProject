import { describe, expect, it, vi } from "vitest";
import {
  ALL_RECIPES,
  INGREDIENTS,
  PRICE_BY_CANONICAL,
  STAPLES,
  canonicalNames,
  inferRestrictions,
  parseIngredient,
  parseIngredientLine,
  recipesFor,
  type PantryProfile,
  type Recipe,
} from "@/lib/engine";

vi.spyOn(console, "log").mockImplementation(() => {});

const profile = (o: Partial<PantryProfile> = {}): PantryProfile => ({
  restrictions: [],
  also_avoid: null,
  likes: null,
  dislikes: null,
  cuisines: null,
  budget: 1000,
  ...o,
});

const mk = (id: number, title: string, ingredients: string[], servings = 2): Recipe => ({
  id,
  title,
  category: "main",
  cuisine: "Test",
  prep_time_minutes: 5,
  cook_time_minutes: 10,
  servings,
  difficulty: "easy",
  ingredients,
  instructions: ["step"],
  tags: [],
});

/** Is this recipe visible to a user with these restrictions? */
const visible = (r: Recipe, restrictions: string[]) =>
  recipesFor(profile({ restrictions }), ["x"], 2, [r]).totalAfterFilter === 1;

describe("data integrity (real recipe_book)", () => {
  it("has 100 recipes with unique ids", () => {
    expect(ALL_RECIPES).toHaveLength(100);
    expect(new Set(ALL_RECIPES.map((r) => r.id)).size).toBe(100);
  });
  it("every recipe ingredient maps to a canonical ingredient", () => {
    const unmatched: string[] = [];
    for (const r of ALL_RECIPES)
      for (const raw of r.ingredients)
        for (const g of parseIngredientLine(raw))
          for (const c of g)
            if (!canonicalNames.has(c)) unmatched.push(`#${r.id} "${raw}" -> "${c}"`);
    expect(unmatched).toEqual([]);
  });
  it("every non-staple canonical ingredient has a price", () => {
    const missing = INGREDIENTS.filter(
      (i) => !STAPLES.has(i.name) && !(PRICE_BY_CANONICAL.get(i.name)! > 0),
    ).map((i) => i.name);
    expect(missing).toEqual([]);
  });
  it("picking an autocomplete suggestion survives parsing unchanged", () => {
    const changed = INGREDIENTS.filter((i) => parseIngredient(i.name) !== i.name).map(
      (i) => `${i.name} -> ${parseIngredient(i.name)}`,
    );
    expect(changed).toEqual([]);
  });
});

describe("parseIngredient / parseIngredientLine", () => {
  it.each([
    ["2 cups all-purpose flour", "all-purpose flour"],
    ["1/2 tsp salt", "salt"],
    ["3 cloves garlic, minced", "garlic"],
    ["1 whole chicken (4 lb)", "whole chicken"],
    ["1 1/2 cups graham cracker crumbs", "graham cracker crumbs"],
    ["Ice", "ice cubes"],
    ["1 can (28 oz) whole peeled tomatoes", "canned tomatoes"],
    ["1/3 cup breadcrumbs", "breadcrumbs"],
    ["1 tsp coriander", "ground coriander"],
    ["green onion", "scallion"],
  ])("%s -> %s", (raw, expected) => {
    expect(parseIngredient(raw)).toBe(expected);
  });
  it("tamarind is not tamari", () => {
    expect(parseIngredient("3 tbsp tamarind paste or lime juice")).toBe("tamarind paste");
  });
  it("splits 'and' lists into separate requirements", () => {
    expect(parseIngredientLine("Salt and pepper to taste")).toEqual([["salt"], ["black pepper"]]);
  });
  it("keeps 'or' as alternatives on one requirement", () => {
    const g = parseIngredientLine("2 tbsp milk or cream");
    expect(g).toHaveLength(1);
    expect(g[0]).toEqual(["milk", "heavy cream"]);
  });
  it("drops pure prep description", () => {
    expect(parseIngredientLine("10 oz frozen spinach, thawed and squeezed dry")).toEqual([
      ["frozen spinach"],
    ]);
  });
});

describe("restriction flags (whole-word, no substring false positives)", () => {
  const flags = (...t: string[]) => inferRestrictions(t);
  it("breadcrumbs / drumstick / graham are not halal/meat problems", () => {
    expect(flags("1/3 cup breadcrumbs")).not.toContain("not halal");
    expect(flags("1 whole chicken (4 lb)")).not.toContain("not halal");
    expect(flags("graham cracker crumbs")).not.toContain("not vegetarian");
  });
  it("tamarind is not soy; peanut butter is peanut, not dairy", () => {
    expect(flags("tamarind paste")).not.toContain("soy");
    expect(flags("1 cup creamy peanut butter")).toContain("peanut");
    expect(flags("1 cup creamy peanut butter")).not.toContain("dairy");
  });
  it("coconut milk / butternut are dairy-free", () => {
    expect(flags("1 can coconut milk")).not.toContain("dairy");
    expect(flags("1 large butternut squash")).not.toContain("dairy");
  });
  it("catches the items the old keyword lists missed", () => {
    expect(flags("8 oz fresh mozzarella")).toContain("dairy");
    expect(flags("1 cup grated pecorino romano")).toContain("dairy");
    expect(flags("1/2 cup mayonnaise")).toContain("egg");
    expect(flags("2 cups egg noodles")).toEqual(expect.arrayContaining(["egg", "gluten"]));
    expect(flags("3 tbsp soy sauce")).toContain("gluten");
    expect(flags("4 burger buns")).toContain("gluten");
    expect(flags("4 salmon fillets")).toEqual(expect.arrayContaining(["fish", "not vegetarian"]));
    expect(flags("1 tsp Worcestershire sauce")).toContain("fish");
    expect(flags("1/2 lb breakfast sausage")).toContain("not halal");
    expect(flags("3 tbsp coffee liqueur")).toContain("not halal");
    expect(flags("2 1/4 tsp unflavored gelatin")).toEqual(
      expect.arrayContaining(["not vegetarian", "not halal"]),
    );
  });
  it("rice noodles and corn tortillas are gluten free", () => {
    expect(flags("8 oz flat rice noodles")).not.toContain("gluten");
    expect(flags("10 corn tortillas")).not.toContain("gluten");
  });
});

/** Independent whole-word lists, written separately from the engine's. */
const TRUTH: Record<string, RegExp> = {
  "gluten free":
    /\b(flour|pasta|spaghetti|fettuccine|penne|fusilli|macaroni|noodles?|bread|buns?|pita|naan|dough|ladyfingers|soy sauce|graham|breadcrumbs)\b/,
  "dairy free": /\b(butter|milk|cheese|cream|yogurt|mozzarella|parmesan|pecorino|cotija|ricotta)\b/,
  egg: /\b(eggs?|mayonnaise|mayo)\b/,
  fish: /\b(fish|salmon|cod|tuna|worcestershire)\b/,
  shellfish: /\b(shrimp|crab|lobster|clams?|mussels?|scallops?)\b/,
  peanut: /\b(peanuts?)\b/,
  vegetarian:
    /\b(chicken|beef|pork|bacon|ham|sausage|steak|lamb|salmon|cod|shrimp|crab|gelatin|worcestershire)\b/,
  halal: /\b(pork|bacon|ham|sausage|beer|liqueur|gelatin|marsala)\b/,
};
const STRIP = /coconut (milk|cream)|peanut butter|butternut|gluten-free|rice noodles?/g;

describe("allergen leak check on all 100 real recipes", () => {
  for (const [restriction, re] of Object.entries(TRUTH)) {
    it(`"${restriction}" never shows a recipe containing the item`, () => {
      const leaks = ALL_RECIPES.filter(
        (r) =>
          visible(r, [restriction]) &&
          r.ingredients.some((s) => re.test(s.toLowerCase().replace(STRIP, " "))),
      ).map((r) => `#${r.id} ${r.title}`);
      expect(leaks).toEqual([]);
    });
  }
});

describe("matching, cost, tiers", () => {
  const pantry = ["rice", "egg", "onion", "garlic", "bread"];
  it("staples never appear in need", () => {
    const r = recipesFor(profile(), [], 2, [
      mk(1, "S", ["1 tsp salt", "1 tbsp olive oil", "1 cup water", "1 tbsp oil"]),
    ]);
    expect(r.nothingToBuy).toHaveLength(1);
    expect(r.nothingToBuy[0]!.need).toEqual([]);
  });
  it("cost doubles when servings double", () => {
    const rec = [mk(1, "Soup", ["1 can crushed tomatoes", "1 cup water"], 4)];
    const c2 = recipesFor(profile(), [], 2, rec).justAFewThings[0]!.estimated_cost;
    const c4 = recipesFor(profile(), [], 4, rec).justAFewThings[0]!.estimated_cost;
    expect(c2).toBeGreaterThan(0);
    expect(c4).toBeCloseTo(c2 * 2, 2);
  });
  it("cost does not depend on how many servings the recipe yields", () => {
    const a = recipesFor(profile(), [], 2, [mk(1, "A", ["1 lemon"], 2)]).justAFewThings[0]!
      .estimated_cost;
    const b = recipesFor(profile(), [], 2, [mk(2, "B", ["1 lemon"], 24)]).justAFewThings[0]!
      .estimated_cost;
    expect(a).toBe(b);
  });
  it("$0 budget empties 'Just a Few Things' and explains why", () => {
    const r = recipesFor(profile({ budget: 0 }), [], 2, [mk(1, "Lemonade", ["1 lemon"])]);
    expect(r.justAFewThings).toHaveLength(0);
    expect(r.fewEmptyReason).toBe("budget");
  });
  it("tier boundaries 0 / 3 / 4 missing", () => {
    const r = recipesFor(profile(), pantry, 2, [
      mk(1, "zero", ["1 cup rice", "2 eggs"]),
      mk(2, "three", ["1 cup rice", "1 cup milk", "1 tbsp butter", "1 lime"]),
      mk(3, "four", ["1 cup rice", "1 cup milk", "1 tbsp butter", "1 lime", "1 cup feta cheese"]),
    ]);
    expect(r.nothingToBuy.map((t) => t.recipe.id)).toEqual([1]);
    expect(r.justAFewThings.map((t) => t.recipe.id)).toEqual([2]);
    expect(r.fewEmptyReason).toBe("none");
  });
  it("'count' reason when every recipe needs more than 3 items", () => {
    const r = recipesFor(profile(), [], 2, [
      mk(1, "big", ["1 lime", "1 lemon", "1 carrot", "1 potato"]),
    ]);
    expect(r.fewEmptyReason).toBe("count");
  });
  it("returns full recipe details when pantry matches need more than three items", () => {
    const r = recipesFor(profile(), ["rice"], 2, [
      mk(1, "Rice feast", ["1 cup rice", "1 lime", "1 lemon", "1 carrot", "1 potato"]),
    ]);
    expect(r.nothingToBuy).toHaveLength(0);
    expect(r.justAFewThings).toHaveLength(0);
    expect(r.closestMatches[0]?.recipe.title).toBe("Rice feast");
    expect(r.closestMatches[0]?.tier.items.find((item) => item.raw === "1 cup rice")?.owned).toBe(
      true,
    );
    expect(r.closestMatches[0]?.tier.need).toHaveLength(4);
  });
  it("generic pantry words cover specific recipe ingredients", () => {
    const r = recipesFor(profile(), ["cheese", "chicken"], 2, [
      mk(1, "Cheddar", ["1 cup shredded cheddar cheese"]),
      mk(2, "Chicken", ["1 lb chicken breast"]),
    ]);
    expect(r.nothingToBuy).toHaveLength(2);
  });
  it("specific pantry staples count as a match without appearing on the shopping list", () => {
    const r = recipesFor(profile(), ["black pepper"], 2, [mk(1, "Pepper", ["1 tsp black pepper"])]);
    expect(r.nothingToBuy).toHaveLength(1);
    expect(r.nothingToBuy[0]!.pantry_matches).toBe(1);
    expect(r.nothingToBuy[0]!.need).toEqual([]);
  });
  it("automatically owned staples do not match an unrelated pantry", () => {
    const r = recipesFor(profile(), ["rice"], 2, [mk(1, "Pepper", ["1 tsp black pepper"])]);
    expect(r.fewEmptyReason).toBe("no-matches");
  });
  it("generic pantry produce covers common recipe variants", () => {
    const r = recipesFor(profile(), ["onion", "tomato", "potato", "bell pepper"], 2, [
      mk(1, "Vegetables", [
        "1 red onion",
        "1 cup cherry tomatoes",
        "1 Yukon Gold potato",
        "1 green bell pepper",
      ]),
    ]);
    expect(r.nothingToBuy).toHaveLength(1);
    expect(r.nothingToBuy[0]!.need).toEqual([]);
  });
  it("an ambiguous oregano pantry alias covers fresh and dried oregano", () => {
    const r = recipesFor(profile(), ["oregano"], 2, [
      mk(1, "Fresh oregano", ["1 tbsp fresh oregano"]),
      mk(2, "Dried oregano", ["1 tsp dried oregano"]),
    ]);
    expect(r.nothingToBuy.map((tier) => tier.recipe.id)).toEqual([1, 2]);
  });
  it("reports when no matching recipe uses the pantry", () => {
    const r = recipesFor(profile(), ["rice"], 2, [mk(1, "Lemonade", ["1 lemon"])]);
    expect(r.fewEmptyReason).toBe("no-matches");
  });
  it("an owned alternative satisfies 'X or Y'", () => {
    const r = recipesFor(profile(), ["cream"], 2, [mk(1, "A", ["2 tbsp milk or cream"])]);
    expect(r.nothingToBuy).toHaveLength(1);
  });
  it("closest matches never repeat a recipe already in a tab", () => {
    const r = recipesFor(profile(), ["rice"], 2, ALL_RECIPES);
    const shown = new Set([...r.nothingToBuy, ...r.justAFewThings].map((t) => t.recipe.id));
    expect(r.closestMatches.filter((m) => shown.has(m.recipe.id))).toEqual([]);
  });
  it("Gather total is the sum of its (serving-scaled) items", () => {
    const r = recipesFor(profile(), ["rice"], 4, ALL_RECIPES);
    const sum = r.shoppingList.reduce((s, i) => s + i.est_price, 0);
    expect(r.shoppingTotal).toBeCloseTo(sum, 2);
  });
  it("liked cuisine breaks cost ties (case-insensitive)", () => {
    const a = mk(1, "Pizza", ["1 lemon"]);
    a.cuisine = "Italian";
    const b = mk(2, "Tacos", ["1 lemon"]);
    b.cuisine = "Mexican";
    const r = recipesFor(profile({ cuisines: "italian" }), [], 2, [b, a]);
    expect(r.justAFewThings[0]!.recipe.id).toBe(1);
  });
});

describe("also avoid / dislikes use whole words", () => {
  it("'ice' does not hide recipes that merely contain the letters", () => {
    const rec = [mk(1, "Rice bowl", ["1 cup rice"]), mk(2, "Slice", ["1 slice bread"])];
    const r = recipesFor(profile({ dislikes: "ice" }), ["x"], 2, rec);
    expect(r.totalAfterFilter).toBe(2);
  });
  it("'egg' hides eggs but not eggplant", () => {
    const rec = [mk(1, "Omelet", ["3 large eggs"]), mk(2, "Eggplant", ["1 eggplant"])];
    const r = recipesFor(profile({ also_avoid: "egg" }), ["x"], 2, rec);
    expect(r.totalAfterFilter).toBe(1);
  });
  it("'cilantro' hides recipes using it", () => {
    const rec = [mk(1, "Salsa", ["1/2 cup fresh cilantro"]), mk(2, "Plain", ["1 cup rice"])];
    expect(recipesFor(profile({ dislikes: "cilantro" }), ["x"], 2, rec).totalAfterFilter).toBe(1);
  });
});
