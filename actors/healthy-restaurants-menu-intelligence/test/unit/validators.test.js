import { describe, expect, it } from "vitest";

import {
  isRestaurantOutput,
  validateInput,
} from "../../src/schemas/validators.js";
import {
  dietaryTagForLabel,
  dietaryTagIds,
} from "../../src/taxonomy/dietary-tags.js";

const defaultKeywords = [
  "healthy restaurant",
  "high protein restaurant",
  "healthy meal prep",
  "salad bar",
  "clean eating restaurant",
];

const validDietaryTag = {
  id: "high_protein",
  labelOriginal: "High Protein",
  sourceType: "restaurant_claim",
  sourceUrl: "https://example.com/menu",
  confidence: 1,
};

const validNutrition = {
  calories: 610,
  proteinGrams: 42,
  carbohydrateGrams: null,
  fatGrams: null,
  sodiumMilligrams: null,
  servingSizeOriginal: null,
  sourceType: "restaurant_published",
  sourceUrl: "https://example.com/menu",
};

const validRecord = {
  actorOutputSchemaVersion: 1,
  restaurantName: "Example Kitchen",
  restaurantNameNormalized: "Example Kitchen",
  matchedKeywords: ["healthy restaurant"],
  location: {
    address: "1 Example Street",
    city: "London",
    region: null,
    country: "United Kingdom",
    countryCode: "GB",
    postalCode: "SW1A 1AA",
    latitude: 51.5,
    longitude: -0.1,
  },
  contact: { website: "https://example.com", phone: null },
  sourceBusiness: {
    platform: "google_maps",
    sourceUrl: "https://maps.google.com/example",
    scrapedAt: "2026-07-26T10:00:00.000Z",
  },
  rating: 4.6,
  reviewCount: 520,
  priceLevel: "££",
  healthyPositioning: {
    isHealthyFocused: true,
    confidence: 0.91,
    signals: [],
  },
  dietaryOptions: [
    {
      id: "vegan",
      labelOriginal: "Vegan",
      sourceType: "restaurant_claim",
      sourceUrl: "https://example.com/menu",
      confidence: 1,
    },
  ],
  menu: {
    status: "extracted",
    sourceUrl: "https://example.com/menu",
    extractionMethods: ["dom_repeated_structure"],
    menuUrls: ["https://example.com/menu"],
    menuCandidates: [
      {
        url: "https://example.com/menu",
        sourceUrl: "https://example.com",
        format: "html",
        score: 80,
        sameDomain: true,
        sources: ["navigation"],
      },
    ],
    itemsFound: 1,
    items: [
      {
        nameOriginal: "Grilled Chicken Protein Bowl",
        nameNormalized: "Grilled Chicken Protein Bowl",
        descriptionOriginal: null,
        descriptionNormalized: null,
        sectionOriginal: "Protein Bowls",
        sectionNormalized: "Protein Bowls",
        price: null,
        extractionMethods: ["dom_repeated_structure"],
        dietaryTags: [validDietaryTag],
        publishedNutrition: validNutrition,
        sourceUrl: "https://example.com/menu",
      },
    ],
  },
  language: { detected: "en", normalizedOutput: "en" },
  warnings: [],
  errors: [],
  scrapedAt: "2026-07-26T10:00:30.000Z",
};

describe("dietary taxonomy", () => {
  it("exports the handoff dietary IDs", () => {
    expect(dietaryTagIds).toEqual([
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
    ]);
  });

  it.each([
    ["vegan", "vegan"],
    ["vegan friendly", "vegan"],
    ["vegan-friendly", "vegan"],
    ["vegetarian", "vegetarian"],
    ["vegetarian friendly", "vegetarian"],
    ["vegetarian-friendly", "vegetarian"],
    ["gluten free", "gluten_free"],
    ["gluten-free", "gluten_free"],
    ["GF", "gluten_free"],
    ["dairy free", "dairy_free"],
    ["dairy-free", "dairy_free"],
    ["DF", "dairy_free"],
    ["nut free", "nut_free"],
    ["nut-free", "nut_free"],
    ["NF", "nut_free"],
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
    ["  High   Protein  ", "high_protein"],
    ["No-Added-Sugar", "no_added_sugar"],
  ])("maps explicit label %j to %j", (label, id) => {
    expect(dietaryTagForLabel(label)).toBe(id);
  });

  it.each([
    undefined,
    null,
    "",
    "   \t\n",
    42,
    {},
    "unverified promise",
    "safe for everyone",
    "vegan and vegetarian",
    "gluten free / dairy free",
    "V",
    "VE",
    "VG",
  ])("returns null for unsupported label %j", (label) => {
    expect(dietaryTagForLabel(label)).toBeNull();
  });
});

describe("healthy restaurant input validation", () => {
  it("trims location and applies the handoff defaults", () => {
    expect(validateInput({ location: " London, United Kingdom " })).toEqual({
      location: "London, United Kingdom",
      keywords: defaultKeywords,
      maxRestaurants: 30,
      includeMenu: true,
      normalizedOutputLanguage: "en",
      preserveOriginalText: true,
      maxMenuPagesPerRestaurant: 3,
      maxMenuItemsPerRestaurant: 200,
    });
  });

  it("rejects a missing or blank location", () => {
    expect(() => validateInput({})).toThrow("location");
    expect(() => validateInput({ location: "   " })).toThrow("location");
  });

  it.each([
    ["maxRestaurants", 0],
    ["maxRestaurants", 101],
    ["maxRestaurants", null],
    ["maxMenuPagesPerRestaurant", 0],
    ["maxMenuPagesPerRestaurant", 11],
    ["maxMenuPagesPerRestaurant", null],
    ["maxMenuItemsPerRestaurant", 0],
    ["maxMenuItemsPerRestaurant", 1001],
    ["maxMenuItemsPerRestaurant", null],
  ])("enforces the %s bound", (field, value) => {
    expect(() => validateInput({ location: "London", [field]: value })).toThrow(
      field,
    );
  });

  it("accepts only English normalized output", () => {
    expect(
      validateInput({ location: "London", normalizedOutputLanguage: "en" }),
    ).toHaveProperty("normalizedOutputLanguage", "en");
    expect(() =>
      validateInput({ location: "London", normalizedOutputLanguage: "fr" }),
    ).toThrow("normalizedOutputLanguage");
    expect(() =>
      validateInput({ location: "London", normalizedOutputLanguage: null }),
    ).toThrow("normalizedOutputLanguage");
  });
});

describe("Phase 4 menu provenance validation", () => {
  it("requires extractionMethods on menu output and items", () => {
    const withoutMenuMethods = structuredClone(validRecord);
    delete withoutMenuMethods.menu.extractionMethods;
    expect(isRestaurantOutput(withoutMenuMethods)).toBe(false);

    const withoutItemMethods = structuredClone(validRecord);
    delete withoutItemMethods.menu.items[0].extractionMethods;
    expect(isRestaurantOutput(withoutItemMethods)).toBe(false);
  });

  it("accepts multiple parsed price amounts", () => {
    expect(
      isRestaurantOutput({
        ...validRecord,
        menu: {
          ...validRecord.menu,
          items: [
            {
              ...validRecord.menu.items[0],
              price: {
                amount: 8,
                amounts: [8, 11],
                currency: "GBP",
                formattedOriginal: "Small £8 / Large £11",
                priceType: "multiple",
              },
            },
          ],
        },
      }),
    ).toBe(true);
  });
});

describe("healthy restaurant output validation", () => {
  it("accepts a complete record and an incomplete menu", () => {
    expect(isRestaurantOutput(validRecord)).toBe(true);
    expect(
      isRestaurantOutput({
        ...validRecord,
        menu: {
          status: "menu_not_found",
          sourceUrl: null,
          menuUrls: [],
          menuCandidates: [],
          extractionMethods: [],
          itemsFound: 0,
          items: [],
        },
      }),
    ).toBe(true);
  });

  it("accepts null original labels when source text is not preserved", () => {
    expect(
      isRestaurantOutput({
        ...validRecord,
        dietaryOptions: [
          { ...validRecord.dietaryOptions[0], labelOriginal: null },
        ],
        menu: {
          ...validRecord.menu,
          items: [
            {
              ...validRecord.menu.items[0],
              dietaryTags: [{ ...validDietaryTag, labelOriginal: null }],
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it.each([
    ["schema version", { actorOutputSchemaVersion: 2 }],
    ["undefined values", { extra: undefined }],
    ["warnings array", { warnings: null }],
    ["errors array", { errors: null }],
    ["restaurant name", { restaurantName: undefined }],
    ["location", { location: undefined }],
    ["source business", { sourceBusiness: undefined }],
    ["language", { language: undefined }],
    ["scraped at", { scrapedAt: undefined }],
    ["menu status", { menu: { ...validRecord.menu, status: "made_up" } }],
    ["menu item count", { menu: { ...validRecord.menu, itemsFound: 2 } }],
    ["menu URLs", { menu: { ...validRecord.menu, menuUrls: [42] } }],
    ["empty menu item", { menu: { ...validRecord.menu, items: [{}] } }],
    ["dietary ID", { dietaryOptions: [{ id: "unverified" }] }],
    [
      "healthy positioning signal",
      {
        healthyPositioning: {
          ...validRecord.healthyPositioning,
          signals: [{ type: "keyword" }],
        },
      },
    ],
    ["warning entry", { warnings: [{ code: "warning" }] }],
    ["error entry", { errors: [{ message: "error" }] }],
    [
      "dietary tag provenance",
      {
        menu: {
          ...validRecord.menu,
          items: [
            {
              ...validRecord.menu.items[0],
              dietaryTags: [{ id: "high_protein", confidence: 1 }],
            },
          ],
        },
      },
    ],
    [
      "nutrition provenance",
      {
        menu: {
          ...validRecord.menu,
          items: [
            {
              ...validRecord.menu.items[0],
              publishedNutrition: { sourceType: "estimated" },
            },
          ],
        },
      },
    ],
    [
      "nutrition field type",
      {
        menu: {
          ...validRecord.menu,
          items: [
            {
              ...validRecord.menu.items[0],
              publishedNutrition: { ...validNutrition, calories: "610" },
            },
          ],
        },
      },
    ],
    [
      "negative nutrition value",
      {
        menu: {
          ...validRecord.menu,
          items: [
            {
              ...validRecord.menu.items[0],
              publishedNutrition: { ...validNutrition, calories: -1 },
            },
          ],
        },
      },
    ],
    [
      "missing nutrition source",
      {
        menu: {
          ...validRecord.menu,
          items: [
            {
              ...validRecord.menu.items[0],
              publishedNutrition: { ...validNutrition, sourceUrl: null },
            },
          ],
        },
      },
    ],
  ])("rejects invalid %s", (_reason, changes) => {
    expect(isRestaurantOutput({ ...validRecord, ...changes })).toBe(false);
  });
});
