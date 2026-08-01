import { describe, expect, it } from "vitest";

import {
  buildSearchJobs,
  deduplicatePlaceCards,
  deduplicateRestaurants,
  normalizeRestaurantCandidate,
} from "../../src/discovery/restaurants.js";

describe("restaurant discovery normalization", () => {
  it("creates one search job for every keyword and location", () => {
    expect(
      buildSearchJobs({
        location: "London, United Kingdom",
        keywords: ["healthy restaurant", "salad bar"],
      }),
    ).toEqual([
      {
        keyword: "healthy restaurant",
        location: "London, United Kingdom",
        query: "healthy restaurant in London, United Kingdom",
      },
      {
        keyword: "salad bar",
        location: "London, United Kingdom",
        query: "salad bar in London, United Kingdom",
      },
    ]);
  });

  it("normalizes a place identity and preserves canonical map metadata", () => {
    const record = normalizeRestaurantCandidate(
      {
        name: "  Green  Kitchen ",
        address: "10 Example Street, London SW1A 1AA",
        phone: "+44 (0)20 1234 5678",
        website: "https://www.Example.com/restaurant/?utm_source=maps#menu",
        sourceUrl:
          "https://www.google.com/maps/place/Green+Kitchen/data=!4m2!3m1!1sabc123",
        placeId: "abc123",
        rating: 4.6,
        matchedKeywords: ["healthy restaurant"],
      },
      "London, United Kingdom",
    );

    expect(record.restaurantName).toBe("Green Kitchen");
    expect(record.restaurantNameNormalized).toBe("green kitchen");
    expect(record.contact).toEqual({
      website: "https://www.example.com/restaurant",
      phone: "+4402012345678",
    });
    expect(record.location.postalCode).toBe("SW1A 1AA");
    expect(record.sourceBusiness).toEqual(
      expect.objectContaining({
        placeId: "abc123",
        canonicalUrl:
          "https://www.google.com/maps/place/Green+Kitchen/data=!4m2!3m1!1sabc123",
      }),
    );
  });
});

describe("restaurant discovery deduplication", () => {
  const candidate = (overrides = {}) =>
    normalizeRestaurantCandidate(
      {
        name: "Green Kitchen",
        address: "10 Example Street, London SW1A 1AA",
        phone: "+44 20 1234 5678",
        website: "https://example.com",
        sourceUrl:
          "https://www.google.com/maps/place/Green+Kitchen/data=!1splace-1",
        placeId: "place-1",
        matchedKeywords: ["healthy restaurant"],
        ...overrides,
      },
      "London, United Kingdom",
    );

  it("merges duplicate keywords and preserves every matched keyword", () => {
    const second = candidate({
      sourceUrl:
        "https://www.google.com/maps/place/Green+Kitchen/data=!1splace-1",
      matchedKeywords: ["salad bar"],
    });

    expect(deduplicateRestaurants([candidate(), second])).toEqual([
      expect.objectContaining({
        matchedKeywords: ["healthy restaurant", "salad bar"],
      }),
    ]);
  });

  it("keeps different branches separate even when their domain and name match", () => {
    const branch = candidate({
      address: "50 Example Road, London E1 1AA",
      phone: "+44 20 9876 5432",
      placeId: "place-2",
      sourceUrl:
        "https://www.google.com/maps/place/Green+Kitchen/data=!1splace-2",
      matchedKeywords: ["salad bar"],
    });

    expect(deduplicateRestaurants([candidate(), branch])).toHaveLength(2);
  });

  it("deduplicates by normalized domain when address and name are compatible", () => {
    const second = candidate({
      name: "Green Kitchen London",
      placeId: null,
      sourceUrl: "https://www.google.com/maps/place/Green+Kitchen+London",
      phone: null,
      matchedKeywords: ["salad bar"],
    });

    expect(deduplicateRestaurants([candidate(), second])).toHaveLength(1);
  });

  it("applies the restaurant cap after deduplication", () => {
    expect(
      deduplicateRestaurants(
        [
          candidate(),
          candidate({ placeId: "place-2", address: "2 Other Road" }),
        ],
        1,
      ),
    ).toHaveLength(1);
  });
});

describe("place-card deduplication", () => {
  it("merges duplicate cards before detail extraction and preserves keywords", () => {
    const cards = deduplicatePlaceCards([
      {
        name: "Green Kitchen",
        sourceUrl:
          "https://www.google.com/maps/place/Green+Kitchen/data=!1splace-1",
        placeId: "place-1",
        matchedKeywords: ["healthy restaurant"],
      },
      {
        name: "Green Kitchen",
        sourceUrl:
          "https://www.google.com/maps/place/Green+Kitchen/data=!1splace-1",
        placeId: "place-1",
        matchedKeywords: ["salad bar"],
      },
    ]);

    expect(cards).toEqual([
      expect.objectContaining({
        placeId: "place-1",
        matchedKeywords: ["healthy restaurant", "salad bar"],
      }),
    ]);
  });

  it("caps detail candidates after deduplication", () => {
    const cards = deduplicatePlaceCards(
      Array.from({ length: 5 }, (_, index) => ({
        name: `Restaurant ${index}`,
        sourceUrl: `https://www.google.com/maps/place/restaurant-${index}`,
        placeId: `place-${index}`,
        matchedKeywords: ["healthy restaurant"],
      })),
      3,
    );

    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.placeId)).toEqual([
      "place-0",
      "place-1",
      "place-2",
    ]);
  });
});
