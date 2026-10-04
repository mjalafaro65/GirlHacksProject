import type { ShoppingItem } from "@/lib/engine";

interface GatherPanelProps {
  items: ShoppingItem[];
  total: number;
}

/** The combined, deduplicated shopping list across the recipes shown. */
export function GatherPanel({ items, total }: GatherPanelProps) {
  if (items.length === 0) return null;

  return (
    <section
      className="fade-up rounded-2xl p-5 shadow-md"
      style={{ background: "var(--card)", color: "var(--card-foreground)" }}
    >
      <h3 className="font-display text-2xl font-semibold">Gather</h3>
      <p className="mt-1 text-xs text-ink/50">
        Everything missing across the recipes shown, deduplicated. Prices are estimates.
      </p>
      <ul className="mt-4 space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item.name} className="flex items-center justify-between gap-3">
            <span className="font-medium">{item.name}</span>
            <span className="text-ink/60">
              est. {item.est_price > 0 ? `$${item.est_price.toFixed(2)}` : "—"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t pt-3 text-sm font-semibold" style={{ borderColor: "var(--parchment-dark)" }}>
        Total est. ${total.toFixed(2)}
      </p>
    </section>
  );
}
