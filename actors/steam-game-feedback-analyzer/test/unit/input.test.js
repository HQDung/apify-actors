import { describe, expect, it } from "vitest";

import {
  extractSteamAppId,
  mergeSteamAppIds,
} from "../../src/input/extract-app-ids.js";
import { normalizeInput } from "../../src/input/normalize-input.js";

describe("Steam app ID extraction", () => {
  it.each([
    ["https://store.steampowered.com/app/123456/Example_Game/", "123456"],
    ["https://store.steampowered.com/app/123456", "123456"],
    ["https://steamcommunity.com/app/123456/reviews/", "123456"],
  ])("extracts %j from %j", (url, expected) => {
    expect(extractSteamAppId(url)).toBe(expected);
  });

  it.each([undefined, null, "", "https://example.com/app/123456", "not a URL"])(
    "returns null for unsupported URL %j",
    (url) => expect(extractSteamAppId(url)).toBeNull(),
  );

  it("merges numeric IDs and URL IDs in stable order without duplicates", () => {
    expect(
      mergeSteamAppIds([123456, "570", 123456], ["https://store.steampowered.com/app/730/Game/"]),
    ).toEqual(["123456", "570", "730"]);
  });
});

describe("raw Actor input normalization", () => {
  it("applies low-cost raw-review defaults", () => {
    expect(normalizeInput({ steamAppIds: [730] })).toMatchObject({
      mode: "feedbackAnalysis",
      steamAppIds: ["730"],
      languages: ["all"],
      reviewFilter: "all",
      purchaseType: "all",
      maxReviewsPerGame: 100,
      includeReviewText: true,
      analysis: { enabled: true },
      aggregation: { enabled: true },
    });
  });

  it("merges app IDs from explicit IDs and Store URLs", () => {
    expect(
      normalizeInput({
        steamAppIds: [730],
        startUrls: [{ url: "https://store.steampowered.com/app/570/Dota_2/" }],
      }).steamAppIds,
    ).toEqual(["730", "570"]);
  });

  it("uses Counter-Strike 2 as the automation-safe default app", () => {
    expect(normalizeInput({}).steamAppIds).toEqual(["730"]);
  });

  it("rejects an explicitly empty app list or unsupported URL", () => {
    expect(() => normalizeInput({ steamAppIds: [], startUrls: [] })).toThrow(/steamAppIds|startUrls/i);
    expect(() => normalizeInput({ steamAppIds: [], startUrls: [{ url: "https://example.com" }] })).toThrow(
      /Steam app ID/i,
    );
  });

  it("normalizes date and purchase filters", () => {
    expect(
      normalizeInput({
        steamAppIds: [730],
        languages: ["english", "vietnamese"],
        reviewFilter: "negative",
        purchaseType: "steamPurchasers",
        dateRange: { from: "2026-07-01", to: "2026-07-31", recentDays: 30 },
        maxReviewsPerGame: 20,
      }),
    ).toMatchObject({
      languages: ["english", "vietnamese"],
      reviewFilter: "negative",
      purchaseType: "steamPurchasers",
      dateRange: {
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-31T00:00:00.000Z",
        recentDays: 30,
      },
      maxReviewsPerGame: 20,
    });
  });
});
