const emptyNutrition = (sourceUrl) => ({
  calories: null,
  proteinGrams: null,
  carbohydrateGrams: null,
  fatGrams: null,
  sodiumMilligrams: null,
  servingSizeOriginal: null,
  sourceType: "restaurant_published",
  sourceUrl,
});

const numberFrom = (value) => {
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) && number >= 0 ? number : null;
};

const fieldLimits = {
  calories: 10_000,
  proteinGrams: 1_000,
  carbohydrateGrams: 1_000,
  fatGrams: 1_000,
  sodiumMilligrams: 100_000,
};

const isPlausible = (field, value) =>
  value === null || value <= fieldLimits[field];

const firstNumber = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = numberFrom(match?.[1]);
    if (value !== null) return value;
  }
  return null;
};

const tableValues = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const values = {};
  for (let index = 0; index < lines.length - 1; index++) {
    const headers = lines[index]
      .split(/\s*\|\s*/)
      .map((value) => value.toLowerCase());
    if (
      headers.length < 2 ||
      !headers.some((header) => /calories?|protein|carb|fat/.test(header))
    )
      continue;
    const cells = lines[index + 1].split(/\s*\|\s*/);
    headers.forEach((header, cellIndex) => {
      const value = numberFrom(
        cells[cellIndex]?.match(/^\s*(\d+(?:\.\d+)?)\s*(?:g|mg|kcal)?\b/i)?.[1],
      );
      if (value === null) return;
      if (/calories?/.test(header)) values.calories = value;
      else if (/protein/.test(header)) values.proteinGrams = value;
      else if (/carb/.test(header)) values.carbohydrateGrams = value;
      else if (/fat/.test(header)) values.fatGrams = value;
      else if (/sodium/.test(header)) values.sodiumMilligrams = value;
    });
  }
  return values;
};

export const parsePublishedNutritionText = (value, sourceUrl = null) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.replace(/\u00a0/g, " ");
  const nutrition = {
    ...emptyNutrition(sourceUrl),
    calories: firstNumber(text, [
      /\b(\d{1,5}(?:\.\d+)?)\s*(?:kcal|calories?)\b/i,
      /\bcalories?\s*[:=-]?\s*(\d{1,5}(?:\.\d+)?)/i,
    ]),
    proteinGrams: firstNumber(text, [
      /\bprotein\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*g\b/i,
      /\b(\d+(?:\.\d+)?)\s*g\s+protein\b/i,
    ]),
    carbohydrateGrams: firstNumber(text, [
      /\b(?:carbs?|carbohydrates?)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*g\b/i,
      /\b(\d+(?:\.\d+)?)\s*g\s+(?:carbs?|carbohydrates?)\b/i,
    ]),
    fatGrams: firstNumber(text, [
      /\bfat\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*g\b/i,
      /\b(\d+(?:\.\d+)?)\s*g\s+fat\b/i,
    ]),
    sodiumMilligrams: firstNumber(text, [
      /\bsodium\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*mg\b/i,
      /\b(\d+(?:\.\d+)?)\s*mg\s+sodium\b/i,
    ]),
  };
  const serving = text.match(/\bserving\s+size\s*[:=-]?\s*([^|;\n]+)/i);
  nutrition.servingSizeOriginal = serving?.[1]?.trim() || null;
  const table = tableValues(text);
  for (const field of [
    "calories",
    "proteinGrams",
    "carbohydrateGrams",
    "fatGrams",
    "sodiumMilligrams",
  ]) {
    if (nutrition[field] === null && table[field] !== undefined)
      nutrition[field] = table[field];
    if (!isPlausible(field, nutrition[field])) nutrition[field] = null;
  }
  const hasValue = Object.entries(nutrition).some(
    ([field, fieldValue]) =>
      field !== "sourceType" && field !== "sourceUrl" && fieldValue !== null,
  );
  return hasValue ? nutrition : null;
};
