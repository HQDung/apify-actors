import { classifyHealthyPositioning } from "../../src/classification/healthy-positioning.js";
import {
  dietaryTagsForOfficialPage,
  extractDietaryTags,
  extractMenuLegends,
} from "../../src/dietary/extraction.js";
import { parsePublishedNutritionText } from "../../src/nutrition/parsing.js";

const dietaryCases = [
  {
    id: "full-text-labels",
    rawText:
      "Vegan, vegetarian, gluten-free, dairy-free, high-protein and plant-based options",
    sourceType: "restaurant_claim",
    sourceUrl: "https://validation.example/dietary/full-text",
  },
  {
    id: "legend-v-vg",
    rawText: "VG Protein Bowl",
    sourceType: "menu_label",
    sourceUrl: "https://validation.example/dietary/legend",
    legends: extractMenuLegends("V = Vegetarian | VG = Vegan"),
  },
  {
    id: "ambiguous-v",
    rawText: "V Green Bowl",
    sourceType: "menu_label",
    sourceUrl: "https://validation.example/dietary/ambiguous-v",
    legends: {},
  },
  {
    id: "ambiguous-vg",
    rawText: "VG Protein Bowl",
    sourceType: "menu_label",
    sourceUrl: "https://validation.example/dietary/ambiguous-vg",
    legends: {},
  },
  {
    id: "conflicting-v",
    rawText: "V Green Bowl",
    sourceType: "menu_label",
    sourceUrl: "https://validation.example/dietary/conflict",
    legends: extractMenuLegends("V = Vegetarian\nV = Vegan"),
  },
  {
    id: "menu-description",
    rawText: "A high-protein, low-carb plant-based bowl",
    sourceType: "menu_description",
    sourceUrl: "https://validation.example/dietary/description",
  },
  {
    id: "menu-section",
    rawText: "Dairy-Free Desserts",
    sourceType: "menu_section",
    sourceUrl: "https://validation.example/dietary/section",
  },
];

const nutritionCases = [
  {
    id: "combined",
    rawText:
      "610 kcal | Protein 42g | Carbs 58g | Fat 22g | Sodium 710mg | Serving size: 1 bowl",
    sourceUrl: "https://validation.example/nutrition/combined",
  },
  {
    id: "reverse",
    rawText:
      "42 g protein; 58 g carbohydrates; 22 g fat; 710 mg sodium; 610 calories",
    sourceUrl: "https://validation.example/nutrition/reverse",
  },
  {
    id: "table",
    rawText: "Calories | Protein | Carbs | Fat\n610 | 42g | 58g | 22g",
    sourceUrl: "https://validation.example/nutrition/table",
  },
  {
    id: "serving-only",
    rawText: "Serving size: 1 bowl",
    sourceUrl: "https://validation.example/nutrition/serving-only",
  },
  {
    id: "false-numbers",
    rawText: "£6.10 · 42 oz · 58% · 22 items",
    sourceUrl: "https://validation.example/nutrition/false-numbers",
  },
  {
    id: "implausible",
    rawText: "99999 kcal | Protein 2000g | Sodium 999999mg",
    sourceUrl: "https://validation.example/nutrition/implausible",
  },
];

const classificationCases = [
  {
    id: "strong-official",
    homepageText:
      "Healthy meal prep with nutritious macro-focused fitness meals.",
    sourceUrl: "https://validation.example/classification/strong-official",
    matchedKeywords: ["healthy restaurant"],
    menuSections: ["High Protein Bowls", "Low Calorie Meal Prep"],
    menuItems: Array.from({ length: 10 }, (_, index) => ({
      nameOriginal: `Meal ${index}`,
      dietaryTags: [{ id: "high_protein" }],
      publishedNutrition: { calories: 500 },
    })),
  },
  {
    id: "macro-program",
    homepageText: "Our macro-focused fitness meals are built for meal prep.",
    sourceUrl: "https://validation.example/classification/macro-program",
    matchedKeywords: ["fitness meals"],
    menuSections: ["Macro Meals", "Fitness Meals"],
    menuItems: Array.from({ length: 6 }, () => ({
      dietaryTags: [{ id: "high_protein" }],
      publishedNutrition: { calories: 500 },
    })),
  },
  {
    id: "mixed-sections",
    homepageText: "A neighborhood restaurant with salads and burgers.",
    sourceUrl: "https://validation.example/classification/mixed-sections",
    matchedKeywords: ["healthy restaurant"],
    menuSections: ["Salads", "Burgers"],
    menuItems: [
      { dietaryTags: [], publishedNutrition: null },
      { dietaryTags: [], publishedNutrition: null },
    ],
  },
  {
    id: "keyword-only",
    homepageText: "",
    sourceUrl: "https://validation.example/classification/keyword-only",
    matchedKeywords: ["healthy restaurant"],
    menuSections: [],
    menuItems: [],
  },
  {
    id: "one-salad",
    homepageText: "Fresh food for everyone.",
    sourceUrl: "https://validation.example/classification/one-salad",
    matchedKeywords: ["healthy restaurant"],
    menuSections: ["Salads"],
    menuItems: [{ dietaryTags: [], publishedNutrition: null }],
  },
  {
    id: "one-vegan",
    homepageText: "Classic menu with a vegan side.",
    sourceUrl: "https://validation.example/classification/one-vegan",
    matchedKeywords: ["healthy restaurant"],
    menuSections: ["Sides"],
    menuItems: [{ dietaryTags: [{ id: "vegan" }], publishedNutrition: null }],
  },
  {
    id: "one-gluten-free",
    homepageText: "Classic menu with gluten-free options.",
    sourceUrl: "https://validation.example/classification/one-gluten-free",
    matchedKeywords: ["healthy restaurant"],
    menuSections: ["Mains"],
    menuItems: [
      { dietaryTags: [{ id: "gluten_free" }], publishedNutrition: null },
    ],
  },
  {
    id: "fresh-natural",
    homepageText: "Fresh, natural ingredients served daily.",
    sourceUrl: "https://validation.example/classification/fresh-natural",
    matchedKeywords: ["restaurant"],
    menuSections: [],
    menuItems: [],
  },
  {
    id: "meal-prep",
    homepageText: "Fitness meal prep with high-protein meals.",
    sourceUrl: "https://validation.example/classification/meal-prep",
    matchedKeywords: ["meal prep"],
    menuSections: ["Meal Prep"],
    menuItems: Array.from({ length: 5 }, () => ({
      dietaryTags: [{ id: "high_protein" }],
      publishedNutrition: { calories: 500 },
    })),
  },
  {
    id: "insufficient",
    homepageText: "",
    sourceUrl: "https://validation.example/classification/insufficient",
    matchedKeywords: [],
    menuSections: [],
    menuItems: [],
  },
];

const officialMetadataCase = {
  id: "nested-jsonld-menu-item",
  rawText:
    '<script type="application/ld+json">{"@type":"Restaurant","description":"Classic dining","hasMenuItem":{"name":"Vegan Side","description":"Vegan options available"}}</script>',
  sourceUrl: "https://validation.example/dietary/nested-jsonld",
};

process.stdout.write(
  JSON.stringify(
    {
      dietary: dietaryCases.map((item) => ({
        ...item,
        actual: extractDietaryTags({ ...item, text: item.rawText }),
      })),
      legends: {
        "legend-v-vg": extractMenuLegends("V = Vegetarian | VG = Vegan"),
        "conflicting-v": extractMenuLegends("V = Vegetarian\nV = Vegan"),
      },
      officialMetadata: {
        ...officialMetadataCase,
        actual: dietaryTagsForOfficialPage(
          officialMetadataCase.rawText,
          officialMetadataCase.sourceUrl,
        ),
      },
      nutrition: nutritionCases.map((item) => ({
        ...item,
        actual: parsePublishedNutritionText(item.rawText, item.sourceUrl),
      })),
      classifications: classificationCases.map((item) => ({
        ...item,
        actual: classifyHealthyPositioning(item),
      })),
    },
    null,
    2,
  ),
);
