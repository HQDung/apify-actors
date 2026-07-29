/**
 * Language-independent dietary identifiers supported by Version 1.
 *
 * These identifiers describe a restaurant's published labels only; they do
 * not represent allergen safety or medical suitability.
 */
export const dietaryTagIds = [
  "vegan",
  "vegetarian",
  "gluten_free",
  "dairy_free",
  "nut_free",
  "halal",
  "kosher",
  "organic",
  "high_protein",
  "low_carb",
  "keto",
  "low_calorie",
  "plant_based",
  "sugar_free",
  "no_added_sugar",
];

const explicitLabels = new Map([
  ["vegan", "vegan"],
  ["vegan friendly", "vegan"],
  ["vegan-friendly", "vegan"],
  ["vegetarian", "vegetarian"],
  ["vegetarian friendly", "vegetarian"],
  ["vegetarian-friendly", "vegetarian"],
  ["gluten free", "gluten_free"],
  ["gluten-free", "gluten_free"],
  ["gf", "gluten_free"],
  ["dairy free", "dairy_free"],
  ["dairy-free", "dairy_free"],
  ["df", "dairy_free"],
  ["nut free", "nut_free"],
  ["nut-free", "nut_free"],
  ["nf", "nut_free"],
  ["halal", "halal"],
  ["kosher", "kosher"],
  ["organic", "organic"],
  ["high protein", "high_protein"],
  ["high-protein", "high_protein"],
  ["low carb", "low_carb"],
  ["low-carb", "low_carb"],
  ["keto", "keto"],
  ["ketogenic", "keto"],
  ["low calorie", "low_calorie"],
  ["low-calorie", "low_calorie"],
  ["plant based", "plant_based"],
  ["plant-based", "plant_based"],
  ["sugar free", "sugar_free"],
  ["sugar-free", "sugar_free"],
  ["no added sugar", "no_added_sugar"],
  ["no-added-sugar", "no_added_sugar"],
  ["no sugar added", "no_added_sugar"],
]);

function normalizeLabel(label) {
  return typeof label === "string"
    ? label.trim().toLowerCase().replace(/\s+/g, " ")
    : null;
}

/**
 * Convert an exact, explicit restaurant label into a supported dietary ID.
 * Unknown, compound, or ambiguous labels intentionally return null.
 */
export function dietaryTagForLabel(label) {
  const normalized = normalizeLabel(label);
  return normalized ? (explicitLabels.get(normalized) ?? null) : null;
}
