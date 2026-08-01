import { describe, expect, it } from "vitest";

import { processGame } from "../../src/runtime/process-game.js";
import { createRunStatistics } from "../../src/runtime/run-statistics.js";

describe("cluster links during game processing", () => {
  it("adds the stable cluster link before pushing analyzed review records", async () => {
    const pushed = [];
    const statistics = createRunStatistics({ now: () => 0 });
    const input = {
      mode: "feedbackAnalysis",
      languages: ["english"],
      reviewFilter: "all",
      purchaseType: "all",
      dateRange: { from: null, to: null, recentDays: null },
      maxReviewsPerGame: 2,
      includeReviewText: true,
      analysis: { enabled: true, clusterSimilarIssues: true },
      aggregation: { enabled: true, minimumClusterSize: 2 },
    };
    const raw = (id) => ({
      recommendationid: id,
      language: "english",
      review: "The game crashes when I open the inventory.",
      timestamp_created: 1785489964,
      voted_up: false,
      author: {},
    });
    const result = await processGame({
      appId: "730",
      input,
      client: {
        getGameDetails: async () => ({ steamAppId: 730, name: "Counter-Strike 2" }),
        fetchReviews: async () => [raw("1"), raw("2")],
      },
      statistics,
      pushData: async (record) => pushed.push(record),
      scrapedAt: "2026-07-31T08:00:00.000Z",
    });

    expect(result.clusters).toHaveLength(1);
    expect(pushed[0].analysis.clusterId).toBe(result.clusters[0].clusterId);
    expect(pushed[1].analysis.clusterId).toBe(result.clusters[0].clusterId);
  });
});
