import { useEffect, useRef, useState } from "react";
import { canonicalsByAlias } from "@/lib/engine";
import { suggestIngredients, type Suggestion } from "@/lib/suggest";

interface IngredientSearchProps {
  selected: string[];
  onAdd: (canonicalName: string) => void;
  onRemove: (name: string) => void;
  allowCustom?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  inputId?: string;
}

/**
 * Pantry ingredient search bar with ranked autocomplete, keyboard support
 * (arrows, Enter, Escape), tap/click, removable chips, and custom entries.
 */
export function IngredientSearch({
  selected,
  onAdd,
  onRemove,
  allowCustom = true,
  placeholder = "Search your pantry — try “rice” or “green onion”",
  ariaLabel = "Search ingredients",
  inputId,
}: IngredientSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const selectedSet = new Set(selected);
  const suggestions = suggestIngredients(query, selectedSet);
  const showNoMatch = allowCustom && query.trim().length > 0 && suggestions.length === 0;
  const showRequiredSuggestion =
    !allowCustom && query.trim().length > 0 && suggestions.length === 0;
  const items: Suggestion[] = suggestions;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const addCanonical = (name: string) => {
    onAdd(name);
    setQuery("");
    setOpen(false);
    setHighlight(0);
  };

  const addCustom = () => {
    const text = query.trim();
    if (!text) return;
    onAdd(text);
    setQuery("");
    setOpen(false);
    setHighlight(0);
  };

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = items[highlight];
      const ambiguousCanonicals = canonicalsByAlias.get(query.trim().toLowerCase());
      if (allowCustom && ambiguousCanonicals && ambiguousCanonicals.length > 1) {
        addCanonical(query.trim());
      } else if (picked) {
        addCanonical(picked.name);
      } else if (allowCustom) {
        addCustom();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        id={inputId}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        className="w-full rounded-xl border px-4 py-3 text-base text-ink outline-none placeholder:text-ink/40 focus:ring-2"
        style={{ background: "var(--parchment)", borderColor: "var(--parchment-dark)" }}
      />

      {open && query.trim().length > 0 && (
        <ul
          role="listbox"
          aria-label="Ingredient suggestions"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border shadow-lg"
          style={{ background: "var(--parchment)", borderColor: "var(--parchment-dark)" }}
        >
          {items.map((s, i) => (
            <li key={s.name} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => addCanonical(s.name)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-ink"
                style={{ background: i === highlight ? "var(--gold-soft)" : "transparent" }}
              >
                <span className="font-medium">{s.name}</span>
                {s.alias && (
                  <span className="text-xs text-ink/60">
                    {s.alias} → {s.name}
                  </span>
                )}
              </button>
            </li>
          ))}
          {showNoMatch && (
            <li>
              <button
                type="button"
                onClick={addCustom}
                className="w-full px-4 py-2.5 text-left text-sm text-ink/70"
              >
                No match. Press Enter to add “{query.trim()}” anyway
              </button>
            </li>
          )}
          {showRequiredSuggestion && (
            <li className="px-4 py-2.5 text-sm text-ink/70">
              No matching catalog ingredient. Try another search.
            </li>
          )}
        </ul>
      )}

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm text-ink"
              style={{ background: "var(--gold-soft)", border: "1px solid var(--gold)" }}
            >
              {chip}
              <button
                type="button"
                aria-label={`Remove ${chip}`}
                onClick={() => onRemove(chip)}
                className="text-ink/60 hover:text-ink"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
