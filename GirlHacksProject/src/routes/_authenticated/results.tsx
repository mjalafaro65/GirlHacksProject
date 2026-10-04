import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LanternLoader } from "@/components/LanternLoader";
import { RecipeCard } from "@/components/RecipeCard";
import { GatherPanel } from "@/components/GatherPanel";
import { recipesFor, type PantryProfile } from "@/lib/engine";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/results")({
  validateSearch: (search: Record<string, unknown>) => {
    const rawPantry = search["p"];
    let pantry: string[] = [];
    if (Array.isArray(rawPantry)) {
      pantry = rawPantry.map(String);
    } else {
      try {
        const parsed = JSON.parse(String(rawPantry ?? "[]"));
        if (Array.isArray(parsed)) pantry = parsed.map(String);
      } catch {
        pantry = [];
      }
    }
    const requestedServings = Number(search["s"]);
    const servings =
      Number.isFinite(requestedServings) && requestedServings >= 1
        ? Math.min(12, Math.trunc(requestedServings))
        : 2;
    return { p: pantry, s: servings };
  },
  head: () => ({
    meta: [
      { title: "Conjured Recipes — Thyme" },
      {
        name: "description",
        content: "Recipes you can cook right now, and the ones that are just a few things away.",
      },
      { property: "og:title", content: "Conjured Recipes — Thyme" },
      {
        property: "og:description",
        content: "Recipes you can cook right now, and the ones that are just a few things away.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { p: pantry, s: servings } = Route.useSearch();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PantryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"nothing" | "few" | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("not signed in");
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("restrictions, also_avoid, likes, dislikes, cuisines, budget")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        // Lanterns light one by one — give them their moment even though
        // the matching itself is instant.
        const [profileData] = await Promise.all([
          Promise.resolve(data),
          new Promise((r) => setTimeout(r, 1000)),
        ]);
        if (cancelled) return;
        setProfile({
          restrictions: profileData?.restrictions ?? [],
          also_avoid: profileData?.also_avoid ?? null,
          likes: profileData?.likes ?? null,
          dislikes: profileData?.dislikes ?? null,
          cuisines: profileData?.cuisines ?? null,
          budget: profileData?.budget ?? null,
        });
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("The grove couldn't reach your recipes. Check your connection and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    if (!profile || pantry.length === 0) return null;
    return recipesFor(profile, pantry, servings);
  }, [profile, pantry, servings]);

  if (pantry.length === 0) {
    return (
      <EmptyState
        message="Your pantry was empty when the grove looked. Add a few ingredients first."
        action={
          <button
            onClick={() => navigate({ to: "/search" })}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold"
            style={{ background: "var(--gold)", color: "var(--forest-dark)" }}
          >
            Back to Your Pantry Grove
          </button>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <LanternLoader label="Consulting the grove…" />
      </div>
    );
  }

  if (error || !results) {
    return (
      <EmptyState
        message={error ?? "Something went wrong conjuring your recipes."}
        action={
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold"
            style={{ background: "var(--gold)", color: "var(--forest-dark)" }}
          >
            Try again
          </button>
        }
      />
    );
  }

  const nothingEmpty = results.nothingToBuy.length === 0;
  const fewEmpty = results.justAFewThings.length === 0;
  const bothEmpty = nothingEmpty && fewEmpty;
  // Open on the first tab that actually has recipes.
  const activeTab: "nothing" | "few" = tab ?? (nothingEmpty ? "few" : "nothing");
  const shownItems = activeTab === "nothing" ? results.nothingToBuy : results.justAFewThings;
  const budgetBlocked = results.fewEmptyReason === "budget";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-4xl font-bold" style={{ color: "var(--gold)" }}>
          Conjured Recipes
        </h1>
        <Link
          to="/search"
          className="text-sm underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          Edit pantry
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {pantry.length} ingredient{pantry.length === 1 ? "" : "s"} in your pantry · serves{" "}
        {servings}
      </p>

      {bothEmpty ? (
        <div
          className="mt-8 rounded-2xl p-6 text-center shadow-md"
          style={{ background: "var(--card)", color: "var(--card-foreground)" }}
        >
          <p className="font-display text-xl">
            {results.closestMatches.length > 0
              ? "Your pantry matches these recipes"
              : "The grove came back empty-handed."}
          </p>
          <p className="mt-2 text-sm text-ink/70">
            {results.closestMatches.length > 0 && !budgetBlocked
              ? "These recipes use ingredients you have, but need more items before you can make them."
              : budgetBlocked
                ? "Some recipes are only a few items away, but they cost more than your budget. Raise your budget in your account settings, or add more ingredients."
                : results.fewEmptyReason === "no-matches"
                  ? "No recipes match your pantry and saved restrictions. Try adding different ingredients or reviewing your account settings."
                  : "Every recipe that matches your pantry still needs more than 3 extra items. Try adding more ingredients to your pantry."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex gap-2" role="tablist" aria-label="Recipe tiers">
            <TabButton
              active={activeTab === "nothing"}
              onClick={() => setTab("nothing")}
              label={`Nothing to Buy (${results.nothingToBuy.length})`}
            />
            <TabButton
              active={activeTab === "few"}
              onClick={() => setTab("few")}
              label={`Just a Few Things (${results.justAFewThings.length})`}
            />
          </div>

          <div className="mt-5 space-y-4">
            {shownItems.length === 0 ? (
              <p
                className="rounded-2xl p-6 text-center text-sm"
                style={{ background: "var(--card)", color: "var(--card-foreground)" }}
              >
                {activeTab === "nothing"
                  ? "No recipe uses only what you have yet — check the other tab."
                  : budgetBlocked
                    ? "Recipes a few items away exist, but they cost more than your budget — raise it in your account settings."
                    : results.nothingToBuy.length > 0
                      ? "No additional recipes are in the few-items tier. Try adding more ingredients to your pantry."
                      : "Every recipe that matches your pantry still needs more than 3 extra items — try adding more ingredients."}
              </p>
            ) : (
              shownItems.map((tier) => (
                <RecipeCard key={tier.recipe.id} tier={tier} budget={profile?.budget ?? null} />
              ))
            )}
          </div>

          <div className="mt-6">
            <GatherPanel items={results.shoppingList} total={results.shoppingTotal} />
          </div>
        </>
      )}

      {results.closestMatches.length > 0 && shownItems.length === 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold" style={{ color: "var(--parchment)" }}>
            Recipes to gather more ingredients for
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            These recipes use at least one ingredient from your pantry. Their cards show what's
            missing and include the instructions.
          </p>
          <div className="mt-4 space-y-3">
            {results.closestMatches.map((m) => (
              <div key={m.recipe.id}>
                {m.reasons.length > 0 && (
                  <p className="mb-2 text-xs text-muted-foreground">{m.reasons.join(" · ")}</p>
                )}
                <RecipeCard tier={m.tier} budget={profile?.budget ?? null} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
      style={
        active
          ? { background: "var(--gold)", color: "var(--forest-dark)" }
          : { background: "var(--muted)", color: "var(--foreground)" }
      }
    >
      {label}
    </button>
  );
}

function EmptyState({ message, action }: { message: string; action: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <span className="text-4xl" aria-hidden>
        🍃
      </span>
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}
