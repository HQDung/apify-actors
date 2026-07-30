const signal = (type, value, sourceUrl) => ({ type, value, sourceUrl });

const officialPattern =
  /\b(?:healthy|nutritious|wellness|clean eating|macro[- ]focused|fitness meals?|healthy meal prep)\b/i;
const mealPrepPattern =
  /\b(?:meal prep|fitness meals?|macro[- ]focused|high[- ]protein meals?)\b/i;
const dedicatedSectionPattern =
  /\b(?:healthy|high[- ]protein|low[- ]calorie|fitness|macro|meal prep|plant[- ]based)\b/i;

const round = (value) => Math.round(value * 100) / 100;

export const classifyHealthyPositioning = ({
  homepageText = "",
  sourceUrl = null,
  matchedKeywords = [],
  menuSections = [],
  menuItems = [],
  dietaryOptions = [],
} = {}) => {
  const signals = [];
  let score = 0;
  if (officialPattern.test(homepageText)) {
    score += 40;
    signals.push(
      signal("official_positioning", "official healthy positioning", sourceUrl),
    );
  }
  const dedicatedSections = menuSections.filter((section) =>
    dedicatedSectionPattern.test(section),
  );
  if (dedicatedSections.length >= 2) {
    score += 30;
    signals.push(
      signal("menu_section", dedicatedSections.join("; "), sourceUrl),
    );
  } else if (
    dedicatedSections.length === 1 &&
    !/^salads?$/i.test(dedicatedSections[0])
  ) {
    score += 10;
    signals.push(signal("menu_section", dedicatedSections[0], sourceUrl));
  }
  const nutritionItems = menuItems.filter((item) => item.publishedNutrition);
  if (
    nutritionItems.length >= 5 ||
    (menuItems.length >= 3 && nutritionItems.length / menuItems.length >= 0.5)
  ) {
    score += 20;
    signals.push(
      signal(
        "nutrition_published",
        `nutrition available for ${nutritionItems.length} menu items`,
        sourceUrl,
      ),
    );
  }
  const taggedItems = menuItems.filter((item) => item.dietaryTags?.length);
  if (menuItems.length >= 3 && taggedItems.length / menuItems.length >= 0.5) {
    score += 15;
    signals.push(
      signal(
        "dietary_menu_density",
        `${taggedItems.length} of ${menuItems.length} items tagged`,
        sourceUrl,
      ),
    );
  }
  if (
    mealPrepPattern.test(homepageText) ||
    menuSections.some((section) => mealPrepPattern.test(section))
  ) {
    score += 20;
    signals.push(
      signal("meal_prep_focus", "meal-prep or fitness focus", sourceUrl),
    );
  }
  if (
    dietaryOptions.length >= 2 &&
    !signals.some((entry) => entry.type === "dietary_menu_density")
  ) {
    score += 15;
    signals.push(
      signal(
        "healthy_product_focus",
        `${dietaryOptions.length} restaurant dietary options`,
        sourceUrl,
      ),
    );
  }
  if (
    !signals.length &&
    matchedKeywords.some((keyword) =>
      /healthy|fitness|nutrition|meal prep/i.test(keyword),
    )
  ) {
    score += 2;
    signals.push(
      signal("weak_keyword_match", matchedKeywords.join(", "), sourceUrl),
    );
  }
  const boundedScore = Math.min(score, 100);
  return {
    isHealthyFocused: score >= 70,
    confidence: round(
      score >= 70
        ? boundedScore / 100
        : Math.min(0.69, 0.5 + boundedScore / 100),
    ),
    signals,
  };
};
