import type { TierResult } from "@/lib/engine";

interface RecipeCardProps {
  tier: TierResult;
  budget: number | null;
}

/** Parchment-leaf recipe card with owned/missing ingredients and expandable steps. */
export function RecipeCard({ tier, budget }: RecipeCardProps) {
  const { recipe } = tier;
  const fitsBudget = budget != null && tier.need.length > 0 && tier.estimated_cost <= budget;
  const totalTime = recipe.prep_time_minutes + recipe.cook_time_minutes;

  return (
    <article
      className="fade-up rounded-2xl p-5 shadow-md"
      style={{ background: "var(--card)", color: "var(--card-foreground)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-display text-2xl font-semibold leading-tight">{recipe.title}</h3>
        {fitsBudget && (
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: "var(--moss)", color: "var(--parchment)" }}
          >
            fits your budget
          </span>
        )}
      </div>

      <p className="mt-1 text-xs uppercase tracking-wide text-ink/50">
        {recipe.category} · {recipe.cuisine} · {totalTime} min ({recipe.prep_time_minutes} prep +{" "}
        {recipe.cook_time_minutes} cook) · {recipe.difficulty}
      </p>

      <ul className="mt-4 space-y-1.5 text-sm">
        {tier.items.map((item, i) => (
          <li key={`${item.raw}-${i}`} className="flex items-start gap-2">
            <span
              aria-hidden
              className="mt-0.5 shrink-0 font-medium"
              style={{ color: item.owned ? "var(--moss)" : "var(--gold)" }}
            >
              {item.owned ? "✓" : "+"}
            </span>
            <span className={item.owned ? "text-ink/70" : "font-medium"}>
              <span
                className="rounded px-1"
                style={
                  item.owned
                    ? undefined
                    : { background: "var(--gold-soft)", outline: "1px solid var(--gold)" }
                }
              >
                {item.raw}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm font-medium">
        {tier.need.length === 0 ? (
          <span style={{ color: "var(--moss)" }}>You have everything you need.</span>
        ) : (
          <>
            Missing {tier.need.length} item{tier.need.length === 1 ? "" : "s"} · est. $
            {tier.estimated_cost.toFixed(2)}
          </>
        )}
      </p>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--moss)" }}>
          Show instructions
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink/80">
          {recipe.instructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </details>
    </article>
  );
}
