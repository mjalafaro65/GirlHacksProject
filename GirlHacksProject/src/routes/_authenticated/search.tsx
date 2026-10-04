import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IngredientSearch } from "@/components/IngredientSearch";
import { LanternLoader } from "@/components/LanternLoader";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Your Pantry Grove — Thyme" },
      {
        name: "description",
        content: "Add the ingredients you already have and conjure recipes from your pantry.",
      },
      { property: "og:title", content: "Your Pantry Grove — Thyme" },
      {
        property: "og:description",
        content: "Add the ingredients you already have and conjure recipes from your pantry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

// Canonical names, so every chip matches exactly. Chosen so a demo shows results
// in BOTH tabs ("Nothing to Buy" and "Just a Few Things").
const SAMPLE_PANTRY = [
  "rice",
  "pasta",
  "egg",
  "onion",
  "garlic",
  "canned tomatoes",
  "cheddar cheese",
  "parmesan cheese",
  "butter",
  "milk",
  "frozen peas",
  "bread",
  "all-purpose flour",
  "sugar",
  "brown sugar",
  "baking powder",
  "lemon",
  "potato",
  "carrot",
  "soy sauce",
  "chicken breast",
  "black beans",
  "tortilla",
];

function SearchPage() {
  const navigate = useNavigate();
  const [chips, setChips] = useState<string[]>([]);
  const [servings, setServings] = useState(2);
  const [conjuring, setConjuring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addChip(name: string) {
    setChips((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }

  function removeChip(name: string) {
    setChips((prev) => prev.filter((c) => c !== name));
  }

  async function conjure() {
    if (chips.length === 0) return;
    setConjuring(true);
    setError(null);
    // /results loads the saved profile itself (never from page state) and shows
    // the lantern loader, so there is no second fetch or second delay here.
    try {
      await navigate({
        to: "/results",
        search: { p: chips, s: servings },
      });
    } catch (e) {
      console.error(e);
      setError("Something went wrong opening your recipes. Try again.");
      setConjuring(false);
    }
  }

  if (conjuring) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <LanternLoader label="Consulting the grove…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold" style={{ color: "var(--gold)" }}>
        Your Pantry Grove
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add what you already have. The grove will do the rest.
      </p>

      <div
        className="mt-8 rounded-2xl p-5 shadow-lg sm:p-6"
        style={{ background: "var(--card)", color: "var(--card-foreground)" }}
      >
        <label htmlFor="servings" className="text-sm font-medium">
          Serving size
        </label>
        <input
          id="servings"
          type="number"
          min={1}
          max={12}
          step={1}
          value={servings}
          onChange={(e) => {
            const requested = Number(e.target.value);
            setServings(
              Number.isFinite(requested) ? Math.max(1, Math.min(12, Math.trunc(requested))) : 1,
            );
          }}
          className="mt-1 w-28 rounded-lg border px-3 py-2 text-base text-ink outline-none focus:ring-2"
          style={{ background: "var(--parchment)", borderColor: "var(--parchment-dark)" }}
        />

        <div className="mt-5">
          <label className="text-sm font-medium">What's in your kitchen?</label>
          <div className="mt-2">
            <IngredientSearch selected={chips} onAdd={addChip} onRemove={removeChip} />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={conjure}
            disabled={chips.length === 0}
            className="inline-flex flex-1 items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold shadow-md transition-transform enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--gold)", color: "var(--forest-dark)" }}
          >
            ✨ Conjure Recipes
          </button>
          <button
            type="button"
            onClick={() => setChips((prev) => [...new Set([...prev, ...SAMPLE_PANTRY])])}
            className="inline-flex items-center justify-center rounded-xl border px-6 py-3 text-sm font-medium transition-colors hover:bg-accent"
            style={{ borderColor: "var(--input)", color: "var(--card-foreground)" }}
          >
            Try a sample pantry
          </button>
        </div>

        {chips.length === 0 && (
          <p className="mt-3 text-xs text-ink/50">Add at least one ingredient to conjure.</p>
        )}
        {error && (
          <div
            className="mt-4 rounded-lg px-4 py-3 text-sm"
            style={{ background: "var(--destructive)", color: "var(--destructive-foreground)" }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
