import { describe, expect, it } from "vitest";

import { deduplicateVenues } from "../../src/deduplication.js";
import { discoverPlaces } from "../../src/discovery/discover-places.js";
import { buildSearchTerms } from "../../src/discovery/search-terms.js";
import {
  extractActivities,
  extractAge,
  extractPricing,
  extractWebsiteData,
} from "../../src/enrichment/extract.js";
import { selectPages } from "../../src/enrichment/select-pages.js";
import { aggregateReviewInsights } from "../../src/reviews/aggregate-review-insights.js";
import { validateInput } from "../../src/schemas/validators.js";
import * as venueTypeTaxonomy from "../../src/taxonomy/venue-types.js";

describe("kids activities MVP", () => {
  it("builds Vietnamese and English search terms", () => {
    expect(
      buildSearchTerms({
        venueTypes: ["indoor_playground"],
        customSearchTerms: [],
        countryCode: "VN",
      }),
    ).toContain("khu vui chơi cho bé");
    expect(
      buildSearchTerms({
        venueTypes: ["soft_play_center"],
        customSearchTerms: [],
        countryCode: "GB",
      }),
    ).toContain("soft play");
  });
  it("does not exceed the per-location place limit when one batch is larger", async () => {
    const cards = Array.from({ length: 6 }, (_, index) => ({
      name: `Venue ${index + 1}`,
      sourceUrl: `https://maps.example/venue-${index + 1}`,
    }));
    const page = {
      setDefaultTimeout: () => {},
      goto: async () => {},
      waitForTimeout: async () => {},
      $$eval: async () => cards,
      locator: () => ({
        first: () => ({
          evaluate: async () => {
            throw new Error("end");
          },
        }),
      }),
    };
    const context = { newPage: async () => page, close: async () => {} };

    const places = await discoverPlaces({
      browser: {},
      createContext: async () => context,
      location: { query: "London, UK" },
      terms: ["indoor playground"],
      maxPlaces: 5,
    });

    expect(places).toHaveLength(5);
  });
  it("normalizes and deduplicates string locations", () => {
    const input = validateInput({
      locations: [
        " London, United Kingdom ",
        "london, united kingdom",
        "Ho Chi Minh City, Vietnam",
      ],
      venueTypes: ["indoor_playground", "indoor_playground"],
    });
    expect(input.locations).toEqual([
      { query: "London, United Kingdom", countryCode: "GB" },
      { query: "Ho Chi Minh City, Vietnam", countryCode: "VN" },
    ]);
    expect(input.venueTypes).toHaveLength(1);
  });
  it("rejects object locations from the old public contract", () => {
    expect(() =>
      validateInput({ locations: [{ query: "London", countryCode: "GB" }] }),
    ).toThrow("Each location must be a string.");
  });
  it("keeps unavailable review collection disabled by default", () => {
    expect(validateInput({ locations: ["London, UK"] }).includeReviews).toBe(
      false,
    );
  });
  it("extracts age, activities, and currencies", () => {
    expect(extractAge("Suitable for ages 1–10").maximumAge).toBe(10);
    expect(extractActivities("Soft play and khu nhà banh")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "soft_play" }),
        expect.objectContaining({ id: "ball_pit" }),
      ]),
    );
    expect(
      extractPricing("Children £12.50", "https://example.com").currency,
    ).toBe("GBP");
    expect(
      extractPricing("Vé trẻ em 120.000₫", "https://example.com").currency,
    ).toBe("VND");
  });
  it("does not turn an unlabeled currency token into a child session price", () => {
    expect(
      extractPricing(
        "Admission information. Save £2 today.",
        "https://example.com",
      ),
    ).toEqual(
      expect.objectContaining({
        currency: null,
        pricingUnit: null,
        childPriceFrom: null,
        priceTextOriginal: null,
        sourceUrl: null,
        confidence: 0,
      }),
    );
  });
  it("maps labeled English and Vietnamese prices to the correct audience", () => {
    expect(
      extractPricing(
        "Children £12.50 per session, adults £2",
        "https://example.com/prices",
      ),
    ).toEqual(
      expect.objectContaining({
        currency: "GBP",
        pricingUnit: "per_session",
        childPriceFrom: 12.5,
        adultPriceFrom: 2,
      }),
    );
    expect(
      extractPricing(
        "Children £12.50, adults £2",
        "https://example.com/prices",
      ),
    ).toEqual(
      expect.objectContaining({ childPriceFrom: 12.5, adultPriceFrom: 2 }),
    );
    expect(
      extractPricing(
        "Vé trẻ em 120.000₫; người lớn 50.000₫; gia đình 300.000₫",
        "https://example.vn/bang-gia",
      ),
    ).toEqual(
      expect.objectContaining({
        currency: "VND",
        childPriceFrom: 120000,
        adultPriceFrom: 50000,
        familyPriceFrom: 300000,
      }),
    );
    expect(
      extractPricing("Vé trẻ em: 120.000 VNĐ", "https://example.vn"),
    ).toEqual(
      expect.objectContaining({ currency: "VND", childPriceFrom: 120000 }),
    );
    expect(extractPricing("Trẻ em 80.000đ", "https://example.vn")).toEqual(
      expect.objectContaining({ currency: "VND", childPriceFrom: 80000 }),
    );
    expect(extractPricing("Children, £12", "https://example.com")).toEqual(
      expect.objectContaining({ currency: "GBP", childPriceFrom: 12 }),
    );
    expect(extractPricing("Child $8", "https://example.com")).toEqual(
      expect.objectContaining({ currency: "USD", childPriceFrom: 8 }),
    );
    expect(extractPricing("Children 12,50 €", "https://example.eu")).toEqual(
      expect.objectContaining({ currency: "EUR", childPriceFrom: 12.5 }),
    );
  });
  it("does not associate distant audience words with unrelated prices", () => {
    expect(
      extractPricing(
        "Children love our play centre. Gift cards from £25",
        "https://example.com",
      ),
    ).toEqual(
      expect.objectContaining({
        currency: null,
        childPriceFrom: null,
        confidence: 0,
      }),
    );
    expect(
      extractPricing("Dành cho trẻ em từ 3 đến 5 tuổi", "https://example.vn"),
    ).toEqual(
      expect.objectContaining({
        currency: null,
        childPriceFrom: null,
        confidence: 0,
      }),
    );
  });
  it("extracts only contextual venue-wide age suitability", () => {
    expect(extractAge("Suitable for children aged 1–10")).toEqual(
      expect.objectContaining({ minimumAge: 1, maximumAge: 10 }),
    );
    expect(extractAge("Dành cho trẻ em từ 3 đến 15 tuổi")).toEqual(
      expect.objectContaining({ minimumAge: 3, maximumAge: 15 }),
    );
    expect(extractAge("Toddler ticket 1 - 2 Years £2")).toEqual(
      expect.objectContaining({
        minimumAge: null,
        maximumAge: null,
        ageTextOriginal: null,
        confidence: 0,
      }),
    );
    expect(extractAge("Tickets: Ages 3-5 £8")).toEqual(
      expect.objectContaining({
        minimumAge: null,
        maximumAge: null,
        ageTextOriginal: null,
        confidence: 0,
      }),
    );
    expect(extractAge("Tickets: children aged 3-5 £8")).toEqual(
      expect.objectContaining({ minimumAge: null, maximumAge: null }),
    );
    expect(extractAge("Vé trẻ em từ 3 đến 5 tuổi: 120.000₫")).toEqual(
      expect.objectContaining({ minimumAge: null, maximumAge: null }),
    );
  });
  it("classifies venue types from venue and activity evidence", () => {
    const flipOut = venueTypeTaxonomy.classifyVenueTypes({
      name: "Flip Out Canary Wharf",
      category: "Amusement center",
      searchTerms: ["indoor playground"],
      activities: [{ id: "trampoline" }, { id: "birthday_party" }],
    });
    expect(flipOut).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "trampoline_park" }),
        expect.objectContaining({ id: "birthday_party_venue" }),
      ]),
    );
    expect(flipOut[0].id).toBe("trampoline_park");

    expect(
      venueTypeTaxonomy.classifyVenueTypes({
        name: "Gambado Indoor Softplay",
        category: "Indoor playground",
        searchTerms: ["indoor playground"],
        activities: [{ id: "soft_play" }],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "soft_play_center" }),
        expect.objectContaining({ id: "indoor_playground" }),
      ]),
    );
    expect(
      venueTypeTaxonomy.classifyVenueTypes({
        name: "McDonald's",
        category: "Restaurant",
        searchTerms: ["indoor playground"],
        activities: [],
      }),
    ).toEqual([{ id: "other", confidence: 0.4 }]);
  });
  it("keeps pricing evidence tied to the page containing the labeled price", () => {
    const result = extractWebsiteData({
      pages: [
        {
          url: "https://example.com",
          text: "Buy a £25 gift card",
          links: [],
        },
        {
          url: "https://example.com/prices",
          text: "Children £12.50",
          links: [],
        },
      ],
    });
    expect(result.pricing).toEqual(
      expect.objectContaining({
        childPriceFrom: 12.5,
        sourceUrl: "https://example.com/prices",
      }),
    );

    const richerResult = extractWebsiteData({
      pages: [
        {
          url: "https://example.com",
          text: "Family £30",
          links: [],
        },
        {
          url: "https://example.com/prices",
          text: "Children £12; Adults £3",
          links: [],
        },
      ],
    });
    expect(richerResult.pricing).toEqual(
      expect.objectContaining({
        childPriceFrom: 12,
        adultPriceFrom: 3,
        sourceUrl: "https://example.com/prices",
      }),
    );
  });
  it("selects bounded relevant pages", () => {
    expect(
      selectPages({
        homepage: "https://play.example/",
        links: [
          { url: "https://play.example/pricing", text: "Prices" },
          { url: "https://other.example/price", text: "Prices" },
        ],
        maximum: 2,
      }),
    ).toEqual(["https://play.example", "https://play.example/pricing"]);
  });
  it("does not merge separate addresses without a stronger key", () => {
    expect(
      deduplicateVenues([
        { name: "Play", address: "One", searchVenueTypes: [] },
        { name: "Play", address: "Two", searchVenueTypes: [] },
      ]),
    ).toHaveLength(2);
  });
  it("aggregates only review observations", () => {
    const insights = aggregateReviewInsights([
      "Friendly staff and clean toddler area",
      "Too crowded and expensive",
    ]);
    expect(insights.staffSentiment).toBe("positive");
    expect(insights.safetyReviewSentiment).toBe("unknown");
  });
});
