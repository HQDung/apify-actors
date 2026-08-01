import { describe, expect, it } from "vitest";

import { processGame } from "../../src/runtime/process-game.js";
import { createRunStatistics } from "../../src/runtime/run-statistics.js";

const input = {
  languages: ["english"],
  reviewFilter: "all",
  purchaseType: "all",
  dateRange: { from: null, to: null, recentDays: null },
  maxReviewsPerGame: 2,
  includeReviewText: true,
  analysis: { enabled: true },
};

const rawReviews = [
  { recommendationid: "ok", language: "english", review: "The game crashes when opening inventory.", timestamp_created: 1785489964, voted_up: false, author: {} },
  { recommendationid: "bad", language: "english", review: "bad", timestamp_created: 1785489965, voted_up: false, author: {} },
];

describe("analysis output isolation", () => {
  it("keeps raw records and marks only the failed analysis", async () => {
    const pushed = [];
    const statistics = createRunStatistics({ now: () => 0 });
    const result = await processGame({
      appId: "730",
      input,
      client: {
        getGameDetails: async () => ({ steamAppId: 730, name: "Counter-Strike 2" }),
        fetchReviews: async () => rawReviews,
      },
      analyze: async (review) => {
        if (review.recommendationid === "bad") throw new Error("ANALYSIS_SCHEMA_INVALID: test schema failure");
        return {
          isActionableFeedback: true,
          actionabilityScore: 0.9,
          primaryFeedbackType: "bugReport",
          feedbackTypes: ["bugReport"],
          sentiment: "negative",
          severity: "high",
          topics: ["crashes"],
          summary: "The review reports a crash.",
          issue: null,
          featureRequest: null,
          positiveSignals: [],
          sourceLanguage: "english",
          analysisLanguage: "english",
          originalTextPreserved: true,
          modelMetadata: { provider: "test", model: "test", schemaVersion: "1.0" },
        };
      },
      statistics,
      pushData: async (record) => pushed.push(record),
      scrapedAt: "2026-07-31T08:00:00.000Z",
    });

    expect(result.records).toHaveLength(2);
    expect(pushed[0]).toMatchObject({ analysisStatus: "success", analysis: { primaryFeedbackType: "bugReport" } });
    expect(pushed[1]).toMatchObject({
      recordType: "review",
      review: { reviewId: "bad", text: "bad" },
      analysisStatus: "failed",
      analysisError: { code: "ANALYSIS_SCHEMA_INVALID" },
    });
    expect(statistics.summary({ finishedAt: 0 })).toMatchObject({
      reviewsAnalyzed: 2,
      analysesSucceeded: 1,
      analysesFailed: 1,
    });
  });
});
