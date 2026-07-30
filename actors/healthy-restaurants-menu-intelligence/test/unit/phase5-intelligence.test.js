import { describe, expect, it } from "vitest";

import { classifyHealthyPositioning } from "../../src/classification/healthy-positioning.js";
import {
  aggregateDietaryOptions,
  dietaryTagsForOfficialPage,
  extractDietaryTags,
  extractMenuLegends,
  resolveDietaryLabel,
} from "../../src/dietary/extraction.js";
import { processMenuPage } from "../../src/menu/process-menu-page.js";
import { parsePublishedNutritionText } from "../../src/nutrition/parsing.js";

const sourceUrl = "https://example.com/menu";

describe("Phase 5 dietary extraction", () => {
  it("resolves ambiguous shorthand only from a page legend", () => {
    expect(resolveDietaryLabel("V", {})).toBeNull();
    expect(resolveDietaryLabel("V", { V: "vegetarian" })).toBe("vegetarian");
    expect(resolveDietaryLabel("VG", { VG: "vegan" })).toBe("vegan");

    const legends = extractMenuLegends(
      "Dietary key: V = Vegetarian | VG = Vegan | GF = Gluten Free",
    );
    expect(legends).toEqual({
      V: "vegetarian",
      VG: "vegan",
      GF: "gluten_free",
    });
  });

  it("does not resolve a shorthand when a page defines it inconsistently", () => {
    const legends = extractMenuLegends("V = Vegetarian\nV = Vegan");
    expect(legends.V).toBeUndefined();
    expect(
      extractDietaryTags({
        text: "V",
        sourceType: "menu_label",
        sourceUrl,
        legends,
      }),
    ).toEqual([]);
  });

  it("keeps item dietary provenance and does not promote one item to a restaurant option", () => {
    const tags = extractDietaryTags({
      text: "VG Protein Bowl — high protein",
      sourceType: "menu_label",
      sourceUrl,
      legends: { VG: "vegan" },
    });
    expect(tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "vegan",
          labelOriginal: "VG",
          sourceType: "menu_label",
          sourceUrl,
          confidence: 1,
        }),
        expect.objectContaining({
          id: "high_protein",
          sourceType: "menu_description",
        }),
      ]),
    );
    expect(aggregateDietaryOptions({ itemTags: [tags], pageTags: [] })).toEqual(
      [],
    );
  });

  it("promotes explicit claims and repeated tagged items with provenance", () => {
    const claim = {
      id: "vegan",
      labelOriginal: "Vegan options",
      sourceType: "restaurant_claim",
      sourceUrl,
      confidence: 1,
    };
    expect(
      aggregateDietaryOptions({
        itemTags: [],
        pageTags: [claim],
      }),
    ).toEqual([claim]);
  });

  it("keeps the strongest restaurant-level provenance once per dietary ID", () => {
    const claim = {
      id: "plant_based",
      labelOriginal: "Plant-Based Menu",
      sourceType: "restaurant_claim",
      sourceUrl,
      confidence: 1,
    };
    const metadata = {
      ...claim,
      labelOriginal: "plant-based",
      sourceType: "website_metadata",
    };
    expect(
      aggregateDietaryOptions({ itemTags: [], pageTags: [metadata, claim] }),
    ).toEqual([claim]);
  });

  it("reads dietary claims from official metadata with metadata provenance", () => {
    const tags = dietaryTagsForOfficialPage(
      '<meta name="description" content="Vegan and gluten-free options available">',
      "https://example.com",
    );
    expect(tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "vegan",
          sourceType: "website_metadata",
        }),
        expect.objectContaining({
          id: "gluten_free",
          sourceType: "website_metadata",
        }),
      ]),
    );
  });

  it("does not promote a nested JSON-LD menu item label to a restaurant claim", () => {
    const tags = dietaryTagsForOfficialPage(
      '<script type="application/ld+json">{"@type":"Restaurant","description":"Classic dining","hasMenuItem":{"name":"Vegan Side","description":"Vegan options available"}}</script>',
      "https://example.com",
    );
    expect(tags).toEqual([]);
  });
});

describe("published nutrition parsing", () => {
  it("parses labelled and combined official nutrition text", () => {
    expect(
      parsePublishedNutritionText(
        "610 kcal | Protein 42g | Carbs 58g | Fat 22g | Sodium 710mg | Serving size: 1 bowl",
        sourceUrl,
      ),
    ).toEqual({
      calories: 610,
      proteinGrams: 42,
      carbohydrateGrams: 58,
      fatGrams: 22,
      sodiumMilligrams: 710,
      servingSizeOriginal: "1 bowl",
      sourceType: "restaurant_published",
      sourceUrl,
    });
  });

  it("parses a simple header/value table and rejects unrelated numbers", () => {
    expect(
      parsePublishedNutritionText(
        "Calories | Protein | Carbs | Fat\n610 | 42g | 58g | 22g\n£6.10 · 42 oz · 58% · 22 items",
        sourceUrl,
      ),
    ).toEqual(
      expect.objectContaining({
        calories: 610,
        proteinGrams: 42,
        carbohydrateGrams: 58,
        fatGrams: 22,
      }),
    );
  });

  it("returns null when no official nutrition label is present", () => {
    expect(
      parsePublishedNutritionText(
        "Quinoa, greens, lemon and tahini — £12",
        sourceUrl,
      ),
    ).toBeNull();
  });

  it("rejects implausible nutrient magnitudes instead of emitting false nutrition", () => {
    expect(
      parsePublishedNutritionText(
        "99999 kcal | Protein 2000g | Sodium 999999mg",
        sourceUrl,
      ),
    ).toBeNull();
  });
});

describe("Phase 5 menu-page enrichment", () => {
  it("adds dietary tags and published nutrition to an extracted official item", async () => {
    const result = await processMenuPage({
      candidate: { url: sourceUrl, format: "html" },
      fetchImpl: async () => ({
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () =>
          '<main><p>VG = Vegan</p><h2>High Protein Bowls</h2><article class="menu-item"><h3>Protein Bowl</h3><p>VG · Protein 42g · 610 kcal</p><span class="price">£12</span></article></main>',
      }),
    });
    expect(result.items[0].dietaryTags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "vegan", sourceType: "menu_label" }),
        expect.objectContaining({ id: "high_protein" }),
      ]),
    );
    expect(result.items[0].publishedNutrition).toEqual(
      expect.objectContaining({ calories: 610, proteinGrams: 42, sourceUrl }),
    );
  });

  it("associates evidence with the matching repeated item block", async () => {
    const result = await processMenuPage({
      candidate: { url: sourceUrl, format: "html" },
      fetchImpl: async () => ({
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () =>
          '<main><p>V = Vegetarian · VG = Vegan</p><h2>Bowls</h2><article class="menu-item"><h3>Green Bowl</h3><p>VG</p></article><h2>Wraps</h2><article class="menu-item"><h3>Green Bowl</h3><p>V</p></article></main>',
      }),
    });
    expect(result.items).toHaveLength(2);
    expect(
      result.items.map((item) => item.dietaryTags.map((tag) => tag.id)),
    ).toEqual([["vegan"], ["vegetarian"]]);
  });

  it("does not treat an isolated item description as a restaurant claim", async () => {
    const result = await processMenuPage({
      candidate: { url: sourceUrl, format: "html" },
      fetchImpl: async () => ({
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () =>
          '<main><article class="menu-item"><h3>Vegan Side</h3><p>Vegan options available</p></article></main>',
      }),
    });
    expect(result.dietaryTags).toEqual([]);
    expect(result.items[0].dietaryTags).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "vegan" })]),
    );
  });
});

describe("healthy positioning classification", () => {
  it("classifies strong official positioning with explainable signals", () => {
    const result = classifyHealthyPositioning({
      homepageText:
        "Healthy meal prep with nutritious macro-focused fitness meals.",
      sourceUrl: "https://example.com",
      matchedKeywords: ["healthy restaurant"],
      menuSections: ["High Protein Bowls", "Low Calorie Meal Prep"],
      menuItems: Array.from({ length: 10 }, (_, index) => ({
        nameOriginal: `Meal ${index}`,
        dietaryTags: [
          {
            id: "high_protein",
            labelOriginal: "High Protein",
            sourceType: "menu_section",
            sourceUrl,
            confidence: 1,
          },
        ],
        publishedNutrition: { calories: 500 },
      })),
    });
    expect(result.isHealthyFocused).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.signals.map((signal) => signal.type)).toEqual(
      expect.arrayContaining([
        "official_positioning",
        "menu_section",
        "nutrition_published",
      ]),
    );
  });

  it("does not classify a keyword match and one healthy item as healthy-focused", () => {
    const result = classifyHealthyPositioning({
      homepageText: "Fresh food and a classic menu.",
      sourceUrl: "https://example.com",
      matchedKeywords: ["healthy restaurant"],
      menuSections: ["Salads"],
      menuItems: [
        {
          nameOriginal: "Vegan Side Salad",
          dietaryTags: [],
          publishedNutrition: { calories: 420 },
        },
      ],
    });
    expect(result.isHealthyFocused).toBe(false);
    expect(result.confidence).toBeLessThan(0.7);
    expect(result.signals.map((signal) => signal.type)).toEqual([
      "weak_keyword_match",
    ]);
  });
});
