import { LOOKUP_KEYS_BY_LENGTH, aliasToCanonical, canonicalNames } from "./data";

const QTY = /^(?:\d+\/\d+|\d*\.\d+|\d+|¼|½|¾|⅓|⅔|⅛|⅜|⅝|⅞|–|-|to)$/;

const UNITS = new Set([
  "cup",
  "cups",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "tsp",
  "teaspoon",
  "teaspoons",
  "oz",
  "ounce",
  "ounces",
  "fl",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "g",
  "gram",
  "grams",
  "kg",
  "kilogram",
  "kilograms",
  "ml",
  "milliliter",
  "milliliters",
  "l",
  "liter",
  "liters",
  "clove",
  "cloves",
  "can",
  "cans",
  "jar",
  "jars",
  "pinch",
  "pinches",
  "dash",
  "dashes",
  "stick",
  "sticks",
  "slice",
  "slices",
  "pack",
  "packs",
  "package",
  "packages",
  "packet",
  "packets",
  "bunch",
  "bunches",
  "sprig",
  "sprigs",
  "stalk",
  "stalks",
  "head",
  "heads",
  "ear",
  "ears",
  "sheet",
  "sheets",
  "handful",
  "handfuls",
  "square",
  "squares",
  "splash",
  "splashes",
  "qt",
  "quart",
  "quarts",
  "pint",
  "pints",
  "gallon",
  "gallons",
  "strip",
  "strips",
  "wedge",
  "wedges",
  "piece",
  "pieces",
]);

/** Words that describe preparation, not the ingredient itself. */
const PREP_WORDS = new Set([
  "chopped",
  "minced",
  "diced",
  "sliced",
  "grated",
  "shredded",
  "fresh",
  "large",
  "small",
  "medium",
  "optional",
  "cooked",
  "boiled",
  "peeled",
  "softened",
  "melted",
  "rinsed",
  "drained",
  "halved",
  "thinly",
  "finely",
  "roughly",
  "room",
  "temperature",
  "ripe",
  "mashed",
  "crumbled",
  "packed",
  "heaping",
  "level",
  "cooled",
  "warm",
  "hot",
  "cold",
  "freshly",
  "ground",
  "whole",
  "cubed",
  "julienned",
  "zested",
  "juiced",
  "toasted",
  "roasted",
  "fried",
  "baked",
  "seared",
  "torn",
  "broken",
  "separated",
  "beaten",
  "whisked",
  "stirred",
  "mixed",
  "combined",
  "reserved",
  "divided",
  "extra",
  "more",
  "less",
  "about",
  "approximately",
  "each",
  "crushed",
  "taste",
  "garnish",
  "serving",
  "seasoned",
  "smoked",
  "dried",
  "thawed",
  "squeezed",
  "dry",
  "removed",
  "pressed",
  "patted",
  "trimmed",
  "pitted",
  "seeded",
  "cored",
  "deveined",
  "pounded",
  "thin",
  "soft",
  "smashed",
  "stems",
  "undrained",
  "wedged",
  "very",
  "thick",
  "tops",
  "florets",
  "floret",
  "strips",
  "strip",
  "wedges",
  "wedge",
  "chunks",
  "chunk",
  "rounds",
  "halves",
  "quartered",
  "lengthwise",
  "crosswise",
  "bite-sized",
  "bite",
  "sized",
]);

/** Extra filler that can make a comma/and segment pure description ("cut into pieces"). */
const FILLER = new Set([
  "cut",
  "into",
  "in",
  "the",
  "for",
  "a",
  "an",
  "with",
  "until",
  "pan",
  "skillet",
  "pieces",
  "piece",
  "wedges",
  "wedge",
  "plus",
  "of",
  "or",
  "and",
  "on",
  "to",
]);

const CANNED_RE = /\b(?:cans?|jars?|tinned)\b/;

/** Trailing "for serving", "to taste", "for the pan" etc. */
const TRAILING_RE =
  /\b(?:for|to)\s+(?:serving|garnish|garnishing|frying|the\s+pan|the\s+skillet|dusting|topping|filling|icing|taste|brushing|drizzling|greasing|coating|decorating|finishing)\b.*$/;

function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (/(ss|us|is)$/.test(word)) return word;
  if (/ies$/.test(word)) return word.slice(0, -3) + "y";
  if (/(ches|shes|xes|ses|zes|oes)$/.test(word)) return word.slice(0, -2);
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

function tidy(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase, trim, singularize, and map through aliases to the canonical name. */
export function normalize(name: string): string {
  const s = tidy(name);
  const direct = aliasToCanonical.get(s);
  if (direct) return direct;
  const sing = singularize(s);
  return aliasToCanonical.get(sing) ?? sing;
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word (plural tolerant) matchers, longest key first. */
const KEY_MATCHERS: { re: RegExp; canonical: string }[] = [];
for (const k of LOOKUP_KEYS_BY_LENGTH) {
  if (k.length < 3) continue;
  const canonical = aliasToCanonical.get(k);
  if (!canonical) continue;
  KEY_MATCHERS.push({ re: new RegExp(`(?:^|\\s)${esc(k)}(?:s|es)?(?:\\s|$)`), canonical });
}

function matchText(text: string): string | null {
  if (!text) return null;
  const direct = aliasToCanonical.get(text) ?? aliasToCanonical.get(singularize(text));
  if (direct) return direct;
  for (const m of KEY_MATCHERS) {
    if (m.re.test(text)) return m.canonical;
  }
  return null;
}

function words(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

/** Drop leading quantities/units and any stray numbers ("zest 2 lemons"). */
function stripQty(ws: string[]): string[] {
  let i = 0;
  while (i < ws.length && (QTY.test(ws[i]!) || UNITS.has(ws[i]!))) i++;
  return ws.slice(i).filter((w) => !/^\d/.test(w));
}

/**
 * Resolve one alternative ("2 cups chopped kale") to a canonical name.
 * Returns { canonical, cleaned } — canonical is null when nothing matched,
 * cleaned is "" when the text held only description words.
 */
function resolveAlt(
  alt: string,
  wasCanned: boolean,
  rawLine: string,
): { canonical: string | null; cleaned: string } {
  const withPrep = tidy(stripQty(words(alt)).join(" "));
  const stripped = words(withPrep)
    .filter((w) => !PREP_WORDS.has(w))
    .join(" ");
  const cleaned = words(stripped)
    .filter((w) => !FILLER.has(w))
    .join(" ");

  // Exact name first so "whole chicken" / "dried oregano" survive prep stripping.
  let canonical =
    matchText(withPrep) ?? matchText(stripped) ?? (cleaned ? matchText(cleaned) : null);

  if (canonical && wasCanned) {
    for (const cand of [`canned ${canonical}`, `canned ${canonical}s`, `canned ${canonical}es`]) {
      if (canonicalNames.has(cand)) {
        canonical = cand;
        break;
      }
    }
  }
  // Dry coriander (tsp/tbsp) is the ground spice, not the herb.
  if (
    canonical === "fresh cilantro" &&
    /\bcoriander\b/.test(alt) &&
    /\b(?:tsp|teaspoons?|tbsp|tablespoons?)\b/.test(rawLine) &&
    canonicalNames.has("ground coriander")
  ) {
    canonical = "ground coriander";
  }
  return { canonical, cleaned };
}

const lineMemo = new Map<string, string[][]>();

/**
 * Parse one free-text ingredient line into requirement groups.
 *   - outer array: every ingredient the line needs ("salt and pepper" → 2)
 *   - inner array: acceptable alternatives for that ingredient ("milk or cream")
 * Unmatched text is kept as its own ingredient so nothing silently disappears.
 */
export function parseIngredientLine(raw: string): string[][] {
  const key = raw.toLowerCase().trim();
  const hit = lineMemo.get(key);
  if (hit) return hit;

  // A full canonical name or alias ("half and half", "dried oregano") wins outright.
  const whole = matchExact(tidy(key));
  if (whole) {
    const out = [[whole]];
    lineMemo.set(key, out);
    return out;
  }

  const wasCanned = CANNED_RE.test(key);
  const s = key
    .replace(/\(.*?\)/g, " ")
    .replace(TRAILING_RE, " ")
    .replace(/\bto taste\b/g, " ");

  const segments = s
    .split(/\s*(?:,|;|&|\band\b|\bplus\b)\s*/)
    .map((x) => x.trim())
    .filter(Boolean);

  const groups: string[][] = [];
  segments.forEach((seg) => {
    const alts = seg
      .split(/\s+or\s+/)
      .map((a) => a.trim())
      .filter(Boolean);
    const matched: string[] = [];
    let firstCleaned = "";
    for (const alt of alts) {
      const { canonical, cleaned } = resolveAlt(alt, wasCanned, key);
      if (canonical) {
        if (!matched.includes(canonical)) matched.push(canonical);
      } else if (cleaned && !firstCleaned) {
        firstCleaned = cleaned;
      }
    }
    if (matched.length > 0) groups.push(matched);
    else if (firstCleaned) groups.push([firstCleaned]); // real but unknown ingredient
    // else: pure description ("diced", "plus more") — drop
  });

  if (groups.length === 0) groups.push([tidy(key) || key]);
  lineMemo.set(key, groups);
  return groups;
}

function matchExact(text: string): string | null {
  return aliasToCanonical.get(text) ?? aliasToCanonical.get(singularize(text)) ?? null;
}

/** Primary canonical name for a line (first ingredient, first alternative). */
export function parseIngredient(raw: string): string {
  const groups = parseIngredientLine(raw);
  return groups[0]?.[0] ?? tidy(raw);
}
