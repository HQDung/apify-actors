import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  deduplicateMenuItems,
  extractMenuItemsFromHtml,
  isValidMenuItemCandidate,
  normalizeMenuText,
  parseMenuPrice,
} from "../../src/menu/extraction.js";

const fixture = (name) =>
  fs.readFileSync(path.join("test/fixtures/menus", name), "utf8");

describe("menu price parsing", () => {
  it.each([
    ["£12.50", { amount: 12.5, currency: "GBP", priceType: "fixed" }],
    ["from £9", { amount: 9, currency: "GBP", priceType: "from" }],
    [
      "£10–£14",
      { amount: 10, amounts: [10, 14], currency: "GBP", priceType: "range" },
    ],
    [
      "Small £8 / Large £11",
      { amount: 8, amounts: [8, 11], currency: "GBP", priceType: "multiple" },
    ],
  ])("parses %s", (value, expected) => {
    expect(parseMenuPrice(value)).toEqual({
      ...expected,
      formattedOriginal: value,
    });
  });

  it("uses reliable GBP context only when no currency symbol is present", () => {
    expect(parseMenuPrice("12.50", { defaultCurrency: "GBP" })).toEqual({
      amount: 12.5,
      currency: "GBP",
      formattedOriginal: "12.50",
      priceType: "fixed",
    });
  });

  it("preserves unparseable price text without inventing an amount", () => {
    expect(parseMenuPrice("market price")).toEqual({
      amount: null,
      currency: null,
      formattedOriginal: "market price",
      priceType: "unknown",
    });
    expect(parseMenuPrice(null)).toBeNull();
  });
});

describe("menu item validation and normalization", () => {
  it("normalizes whitespace and accents without translating source text", () => {
    expect(normalizeMenuText("  Crème   brûlée  ")).toBe("creme brulee");
  });

  it.each([
    ["navigation", "Menu Home", null],
    ["footer", "Opening hours: 10:00–22:00", null],
    ["address", "1 Example Street, London", null],
    ["promotion", "Limited time offer - 2 for 1", "£10"],
    ["price-only", "£12", "£12"],
    ["heading", "Starters", null],
  ])("rejects %s candidates", (_label, name, priceText) => {
    expect(
      isValidMenuItemCandidate({
        nameOriginal: name,
        descriptionOriginal: null,
        priceText,
        sectionOriginal: null,
      }),
    ).toBe(false);
  });

  it("inherits a nearby section heading for repeated menu cards", () => {
    const result = extractMenuItemsFromHtml(
      `<section><h2>Bowls</h2><article class="menu-item"><h3>Green Bowl</h3><p>Quinoa and greens</p><span>£12</span></article></section>`,
      "https://example.com/menu",
      { maxItems: 10 },
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        sectionOriginal: "Bowls",
        sectionNormalized: "bowls",
        nameOriginal: "Green Bowl",
        descriptionOriginal: "Quinoa and greens",
        price: expect.objectContaining({ amount: 12, currency: "GBP" }),
      }),
    ]);
  });
});

describe("menu item deduplication", () => {
  it("keeps the more complete duplicate and separates material prices", () => {
    const base = {
      nameOriginal: "Green Bowl",
      nameNormalized: "green bowl",
      sectionOriginal: "Bowls",
      sectionNormalized: "bowls",
      price: {
        amount: 12,
        currency: "GBP",
        formattedOriginal: "£12",
        priceType: "fixed",
      },
      sourceUrl: "https://example.com/menu",
      descriptionOriginal: null,
      descriptionNormalized: null,
      extractionMethods: ["dom_repeated_structure"],
    };

    const result = deduplicateMenuItems([
      base,
      {
        ...base,
        descriptionOriginal: "Quinoa, herbs and greens",
        descriptionNormalized: "quinoa herbs and greens",
        extractionMethods: ["json_ld"],
      },
      {
        ...base,
        price: { ...base.price, amount: 14, formattedOriginal: "£14" },
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].descriptionOriginal).toBe("Quinoa, herbs and greens");
  });

  it("merges an unpriced copy into a priced copy", () => {
    const shared = {
      nameOriginal: "Green Bowl",
      nameNormalized: "green bowl",
      sectionOriginal: "Bowls",
      sectionNormalized: "bowls",
      descriptionOriginal: "Quinoa and greens",
      descriptionNormalized: "quinoa and greens",
      sourceUrl: "https://example.com/menu",
      extractionMethods: ["dom_repeated_structure"],
    };
    const result = deduplicateMenuItems([
      { ...shared, price: null },
      {
        ...shared,
        price: {
          amount: 12,
          currency: "GBP",
          formattedOriginal: "£12",
          priceType: "fixed",
        },
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].price.amount).toBe(12);
  });

  it("does not expose an undefined internal evidence field after deduplication", () => {
    const item = {
      nameOriginal: "Green Bowl",
      nameNormalized: "green bowl",
      sectionOriginal: "Bowls",
      sectionNormalized: "bowls",
      descriptionOriginal: null,
      descriptionNormalized: null,
      price: null,
      sourceUrl: "https://example.com/menu",
      extractionMethods: ["dom_repeated_structure"],
      publishedNutrition: null,
      dietaryTags: [],
    };

    const [result] = deduplicateMenuItems([item, { ...item }]);

    expect(result).not.toHaveProperty("sourceEvidenceText");
  });
});

describe("layered HTML menu extraction", () => {
  it("extracts a standard card with section, description, price, and provenance", () => {
    const result = extractMenuItemsFromHtml(
      fixture("standard-card.html"),
      "https://example.com/menu",
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        nameOriginal: "Green Bowl",
        sectionOriginal: "Bowls",
        descriptionOriginal: "Quinoa, herbs and seasonal greens",
        sourceUrl: "https://example.com/menu",
        extractionMethods: ["dom_repeated_structure"],
      }),
    );
  });

  it("extracts list and sectioned menu structures", () => {
    const list = extractMenuItemsFromHtml(
      fixture("list-menu.html"),
      "https://example.com/menu",
    );
    const sectioned = extractMenuItemsFromHtml(
      fixture("sectioned-menu.html"),
      "https://example.com/menu",
    );
    expect(list.items.map((item) => item.nameOriginal)).toEqual([
      "Roasted Salmon",
      "Lentil Soup",
    ]);
    expect(sectioned.items.map((item) => item.sectionOriginal)).toEqual([
      "Small Plates",
      "Desserts",
    ]);
  });

  it("supports no-price items and JSON-LD menu items", () => {
    const noPrices = extractMenuItemsFromHtml(
      fixture("no-prices.html"),
      "https://example.com/menu",
    );
    const jsonLd = extractMenuItemsFromHtml(
      fixture("jsonld-menu.html"),
      "https://example.com/menu",
      { defaultCurrency: "GBP" },
    );
    expect(noPrices.items[0].price).toBeNull();
    expect(jsonLd.items[0]).toEqual(
      expect.objectContaining({
        nameOriginal: "Chickpea Curry",
        sectionOriginal: "Mains",
        extractionMethods: ["json_ld"],
        price: expect.objectContaining({ currency: "GBP" }),
      }),
    );
  });

  it("extracts safely detectable embedded JSON and uses text fallback", () => {
    const embedded = extractMenuItemsFromHtml(
      fixture("embedded-json.html"),
      "https://example.com/menu",
      { defaultCurrency: "GBP" },
    );
    const fallback = extractMenuItemsFromHtml(
      fixture("text-fallback.html"),
      "https://example.com/menu",
    );
    expect(embedded.items[0]).toEqual(
      expect.objectContaining({
        nameOriginal: "Protein Plate",
        extractionMethods: ["embedded_json"],
      }),
    );
    expect(fallback.items.map((item) => item.nameOriginal)).toEqual([
      "Protein Plate",
      "Green Salad",
    ]);
    expect(fallback.items[0].sectionOriginal).toBe("Daily Menu");
  });

  it("deduplicates mobile and desktop markup, rejects promotions, and survives malformed JSON", () => {
    const duplicate = extractMenuItemsFromHtml(
      fixture("duplicate-mobile-desktop.html"),
      "https://example.com/menu",
    );
    const promotion = extractMenuItemsFromHtml(
      fixture("promotional.html"),
      "https://example.com/menu",
    );
    const malformed = extractMenuItemsFromHtml(
      fixture("malformed-structured.html"),
      "https://example.com/menu",
    );
    expect(duplicate.items).toHaveLength(1);
    expect(promotion.items).toHaveLength(0);
    expect(malformed.items[0].nameOriginal).toBe("Tofu Bowl");
  });

  it("returns no items for an empty menu and enforces the item limit", () => {
    expect(
      extractMenuItemsFromHtml(
        fixture("empty.html"),
        "https://example.com/menu",
      ).items,
    ).toEqual([]);
    expect(
      extractMenuItemsFromHtml(
        fixture("list-menu.html"),
        "https://example.com/menu",
        {
          maxItems: 1,
        },
      ).items,
    ).toHaveLength(1);
  });
});
