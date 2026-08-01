import { describe, expect, it } from "vitest";

import { processGame } from "../../src/runtime/process-game.js";
import { createRunStatistics } from "../../src/runtime/run-statistics.js";

describe("raw game processing", () => {
  it("pushes normalized reviews incrementally after collecting one game", async () => {
    const pushed = [];
    const statistics = createRunStatistics({ now: () => 0 });
    const client = {
      getGameDetails: async () => ({ steamAppId: 730, name: "Counter-Strike 2" }),
      fetchReviews: async () => [
        {
          recommendationid: "1",
          language: "english",
          review: "Good",
          timestamp_created: 1785489964,
          timestamp_updated: 1785489964,
          voted_up: true,
          author: {},
        },
      ],
    };

    const result = await processGame({
      appId: "730",
      input: { ...{
        languages: ["english"],
        reviewFilter: "all",
        purchaseType: "all",
        dateRange: { from: null, to: null, recentDays: null },
        maxReviewsPerGame: 10,
        includeReviewText: true,
      } },
      client,
      statistics,
      pushData: async (record) => pushed.push(record),
      scrapedAt: "2026-07-31T08:00:00.000Z",
    });

    expect(result.records).toHaveLength(1);
    expect(pushed[0]).toMatchObject({
      recordType: "review",
      game: { steamAppId: 730, name: "Counter-Strike 2" },
      review: { reviewId: "1", text: "Good" },
    });
    expect(statistics.summary({ finishedAt: 0 })).toMatchObject({
      reviewsRequested: 10,
      reviewsCollected: 1,
      reviewsPushed: 1,
    });
  });
});
