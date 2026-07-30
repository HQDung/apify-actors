import { describe, expect, it } from "vitest";

import { createRunStatistics } from "../../src/runtime/run-statistics.js";

describe("run statistics", () => {
  it("starts all aggregate counters at zero", () => {
    const statistics = createRunStatistics({ now: () => 1_000 });
    const summary = statistics.summary({ finishedAt: 2_500 });

    expect(summary).toMatchObject({
      searchJobs: 0,
      rawPlacesDiscovered: 0,
      restaurantsAfterDeduplication: 0,
      restaurantsProcessed: 0,
      websitesAvailable: 0,
      websitesReachable: 0,
      menuUrlsFound: 0,
      htmlMenusProcessed: 0,
      menusExtracted: 0,
      menusExtractedEmpty: 0,
      unsupportedMenus: 0,
      menuFailures: 0,
      rawMenuItems: 0,
      deduplicatedMenuItems: 0,
      itemsAfterLimits: 0,
      itemsWithDietaryTags: 0,
      itemsWithPublishedNutrition: 0,
      healthyFocusedRestaurants: 0,
      uncertainClassifications: 0,
      notHealthyFocusedRestaurants: 0,
      warnings: 0,
      errors: 0,
      resultsPushed: 0,
      runtimeSeconds: 1.5,
    });
  });

  it("increments known counters and clamps invalid amounts", () => {
    const statistics = createRunStatistics({ now: () => 0 });
    statistics.increment("rawPlacesDiscovered", 3);
    statistics.increment("rawPlacesDiscovered", -10);
    statistics.set("websitesAvailable", 2.8);

    expect(statistics.summary({ finishedAt: 0 })).toMatchObject({
      rawPlacesDiscovered: 0,
      websitesAvailable: 2,
    });
  });

  it("returns an independent JSON-safe summary", () => {
    const statistics = createRunStatistics({ now: () => 0 });
    statistics.increment("resultsPushed");
    const summary = statistics.summary({ finishedAt: 0 });
    summary.resultsPushed = 99;

    expect(statistics.summary({ finishedAt: 0 }).resultsPushed).toBe(1);
    expect(() => JSON.stringify(summary)).not.toThrow();
  });
});
