export interface IngredientInfo {
  name: string;
  aliases: string[];
  category: string;
  est_price: number;
}

export interface Recipe {
  id: number;
  title: string;
  category: string;
  cuisine: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  difficulty: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
}

/** The per-user profile fields stored in the database. */
export interface PantryProfile {
  restrictions: string[];
  also_avoid: string | null;
  likes: string | null;
  dislikes: string | null;
  cuisines: string | null;
  budget: number | null;
}

/** One recipe ingredient line, resolved against the pantry. */
export interface RecipeItem {
  raw: string;
  /** Primary canonical name of the line (first ingredient, first alternative). */
  canonical: string;
  /** Every canonical alternative for the line's first ingredient ("milk or cream"). */
  alternatives: string[];
  /** True only if every ingredient on the line is covered. */
  owned: boolean;
}

export interface TierResult {
  recipe: Recipe;
  items: RecipeItem[];
  need: string[];
  have: string[];
  /** How many of the user's own (non-staple) pantry items this recipe uses. */
  pantry_matches: number;
  /** Estimated USD for the missing items, for the serving size searched. */
  estimated_cost: number;
}

export interface ShoppingItem {
  name: string;
  /** Estimated USD for the serving size searched. */
  est_price: number;
}

export interface ClosestMatch {
  recipe: Recipe;
  missingCount: number;
  estimated_cost: number;
  reasons: string[];
  tier: TierResult;
}

export type EmptyReason = "none" | "budget" | "count" | "no-matches";

export interface SearchResults {
  nothingToBuy: TierResult[];
  justAFewThings: TierResult[];
  shoppingList: ShoppingItem[];
  shoppingTotal: number;
  closestMatches: ClosestMatch[];
  totalBeforeFilter: number;
  totalAfterFilter: number;
  /** Why "Just a Few Things" is empty: over budget, or every recipe needs >3 items. */
  fewEmptyReason: EmptyReason;
}
