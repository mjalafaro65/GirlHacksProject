/**
 * Derive restriction flags from ingredient text. Feed it BOTH the raw recipe
 * lines and the canonical names. Matching is whole-word, so "breadcrumbs" is
 * not "rum", "graham" is not "ham", and "tamarind" is not "tamari".
 * Never trusts recipe tags or category.
 */

function words(list: string[]): RegExp {
  return new RegExp(`\\b(?:${list.join("|")})(?:s|es)?\\b`);
}

// Phrases that LOOK like an allergen but are not (removed before checking dairy).
const NOT_DAIRY = new RegExp(
  "\\b(?:coconut (?:milk|cream|butter)|almond (?:milk|butter)|oat milk|soy milk|rice milk|" +
    "cashew (?:milk|butter)|peanut butter|sunflower (?:seed )?butter|nut butter|cocoa butter|" +
    "shea butter|butternut|butter beans?|butter lettuce|cream of tartar)\\b",
  "g",
);
const NOT_GLUTEN = new RegExp(
  "\\b(?:(?:almond|coconut|rice|corn|chickpea|tapioca|potato|cassava|buckwheat) flour|" +
    "rice noodles?|rice vermicelli|glass noodles?|corn tortillas?|gluten[- ]free [a-z ]+|cornstarch|cornmeal)\\b",
  "g",
);
const NOT_ALCOHOL = /\bwine vinegars?\b|\bvinegar\b/g;

const DAIRY = words([
  "butter",
  "buttermilk",
  "milk",
  "cheese",
  "cream",
  "yogh?urt",
  "ricotta",
  "mascarpone",
  "parmesan",
  "parmigiano",
  "pecorino",
  "mozzarella",
  "cheddar",
  "feta",
  "gruy[eè]re",
  "paneer",
  "ghee",
  "whey",
  "casein",
  "cotija",
  "brie",
  "halloumi",
  "gouda",
  "queso",
  "custard",
  "half and half",
  "half-and-half",
  "kefir",
  "ice cream",
  "gelato",
]);
const EGG = words(["egg", "mayonnaise", "mayo", "ladyfinger", "meringue", "aioli"]);
const GLUTEN = words([
  "flour",
  "pasta",
  "spaghetti",
  "fettuccine",
  "linguine",
  "penne",
  "fusilli",
  "macaroni",
  "farfalle",
  "orzo",
  "lasagna",
  "rigatoni",
  "noodle",
  "udon",
  "ramen",
  "bread",
  "breadcrumb",
  "panko",
  "bun",
  "bagel",
  "baguette",
  "pita",
  "naan",
  "tortilla",
  "muffin",
  "ciabatta",
  "sourdough",
  "biscuit",
  "cracker",
  "graham",
  "crouton",
  "dough",
  "couscous",
  "bulgur",
  "farro",
  "semolina",
  "barley",
  "rye",
  "seitan",
  "ladyfinger",
  "soy sauce",
  "teriyaki",
  "hoisin",
  "beer",
  "oat",
  "wheat",
  "malt",
]);
const SOY = words([
  "soy",
  "soya",
  "soybean",
  "tofu",
  "tamari",
  "edamame",
  "tempeh",
  "miso",
  "teriyaki",
  "hoisin",
]);
const PEANUT = words(["peanut"]);
const TREE_NUT = words([
  "almond",
  "walnut",
  "cashew",
  "pecan",
  "hazelnut",
  "pistachio",
  "macadamia",
  "pine nut",
  "brazil nut",
  "nutella",
  "marzipan",
  "praline",
  "chestnut",
]);
const SHELLFISH = words([
  "shrimp",
  "prawn",
  "crab",
  "lobster",
  "mussel",
  "clam",
  "oyster",
  "scallop",
  "squid",
  "calamari",
  "crawfish",
  "crayfish",
  "langoustine",
]);
const FISH = words([
  "fish",
  "salmon",
  "tuna",
  "cod",
  "tilapia",
  "anchov(?:y|ie)",
  "sardine",
  "halibut",
  "trout",
  "mahi",
  "haddock",
  "snapper",
  "catfish",
  "bass",
  "mackerel",
  "worcestershire",
]);
const MEAT = words([
  "chicken",
  "beef",
  "turkey",
  "pork",
  "bacon",
  "ham",
  "sausage",
  "steak",
  "ribeye",
  "lamb",
  "duck",
  "salami",
  "prosciutto",
  "chorizo",
  "pancetta",
  "veal",
  "lard",
  "brisket",
  "pepperoni",
  "meatball",
  "bone broth",
  "gelatin",
  "gelatine",
  "venison",
]);
const NON_VEGAN_EXTRA = words([
  "honey",
  "gelatin",
  "gelatine",
  "marshmallow",
  "lard",
  "casein",
  "whey",
]);
const PORK_ETC = words([
  "pork",
  "bacon",
  "ham",
  "pancetta",
  "chorizo",
  "prosciutto",
  "sausage",
  "lard",
  "pepperoni",
  "salami",
  "gelatin",
  "gelatine",
]);
const ALCOHOL = words([
  "wine",
  "beer",
  "rum",
  "vodka",
  "mirin",
  "liqueur",
  "brandy",
  "whisk(?:e)?y",
  "sherry",
  "marsala",
  "bourbon",
  "sake",
  "amaretto",
  "tequila",
  "alcohol",
  "champagne",
  "cognac",
]);

export function inferRestrictions(ingredientTexts: string[]): string[] {
  const flags = new Set<string>();
  let dairy = false,
    egg = false,
    meat = false,
    fish = false,
    shellfish = false;
  let nonVeganExtra = false;

  for (const t of ingredientTexts) {
    const s = t.toLowerCase();
    const dairyText = s.replace(NOT_DAIRY, " ");
    const glutenText = s.replace(NOT_GLUTEN, " ");
    const alcoholText = s.replace(NOT_ALCOHOL, " ");

    if (DAIRY.test(dairyText)) dairy = true;
    if (EGG.test(s)) egg = true;
    if (GLUTEN.test(glutenText)) flags.add("gluten");
    if (SOY.test(s)) flags.add("soy");
    if (PEANUT.test(s)) flags.add("peanut");
    if (TREE_NUT.test(s)) flags.add("tree nut");
    if (SHELLFISH.test(s)) shellfish = true;
    if (FISH.test(s)) fish = true;
    if (MEAT.test(s)) meat = true;
    if (NON_VEGAN_EXTRA.test(s)) nonVeganExtra = true;
    if (PORK_ETC.test(s) || ALCOHOL.test(alcoholText)) flags.add("not halal");
  }

  if (dairy) flags.add("dairy");
  if (egg) flags.add("egg");
  if (fish) flags.add("fish");
  if (shellfish) flags.add("shellfish");
  if (meat || fish || shellfish) flags.add("not vegetarian");
  if (dairy || egg || meat || fish || shellfish || nonVeganExtra) flags.add("not vegan");
  return [...flags];
}
