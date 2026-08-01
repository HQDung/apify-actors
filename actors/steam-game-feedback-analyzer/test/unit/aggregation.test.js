import { describe, expect, it } from "vitest";

import { aggregateGameReport } from "../../src/aggregation/aggregate-game-report.js";

const reviewRecord = ({ id, language = "english", recommended, analysisStatus = "success", analysis }) => ({
  recordType: "review",
  game: { steamAppId: 730, name: "Counter-Strike 2", storeUrl: "https://store.steampowered.com/app/730/" },
  review: {
    reviewId: id,
    language,
    text: `${id} source text`,
    recommended,
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: null,
  },
  analysisStatus,
  ...(analysis ? { analysis } : {}),
});

const crashAnalysis = {
  isActionableFeedback: true,
  actionabilityScore: 0.9,
  primaryFeedbackType: "bugReport",
  feedbackTypes: ["bugReport", "stabilityIssue"],
  sentiment: "negative",
  severity: "high",
  topics: ["crashes", "inventory"],
  summary: "The review reports a crash when opening the inventory.",
  issue: { title: "Reported crash when opening the inventory", triggerSignals: ["opening the inventory"] },
  featureRequest: null,
};

const featureAnalysis = {
  isActionableFeedback: true,
  actionabilityScore: 0.8,
  primaryFeedbackType: "featureRequest",
  feedbackTypes: ["featureRequest"],
  sentiment: "positive",
  severity: "unknown",
  topics: ["saveSystem"],
  summary: "The player requests manual save slots.",
  issue: null,
  featureRequest: { title: "manual save slots" },
};

describe("game feedback aggregation", () => {
  it("counts review sentiment, languages, actionability, and ranked topics", () => {
    const report = aggregateGameReport({
      game: { steamAppId: 730, name: "Counter-Strike 2", storeUrl: "https://store.steampowered.com/app/730/" },
      records: [
        reviewRecord({ id: "1", recommended: false, analysis: crashAnalysis }),
        reviewRecord({ id: "2", recommended: true, analysis: featureAnalysis }),
        reviewRecord({ id: "3", language: "vietnamese", recommended: false, analysis: crashAnalysis }),
      ],
      dateRange: { from: null, to: null },
      generatedAt: "2026-07-31T08:00:00.000Z",
    });

    expect(report).toMatchObject({
      recordType: "gameFeedbackReport",
      game: { steamAppId: 730, name: "Counter-Strike 2" },
      statistics: {
        reviewsCollected: 3,
        reviewsAnalyzed: 3,
        positiveReviews: 1,
        negativeReviews: 2,
        actionableReviews: 3,
        languages: { english: 2, vietnamese: 1 },
      },
      topIssues: [{ title: "Reported crash when opening the inventory", mentionCount: 2, severity: "high" }],
      topFeatureRequests: [{ title: "manual save slots", mentionCount: 1 }],
      topPositiveTopics: [{ topic: "saveSystem", mentionCount: 1 }],
      generatedAt: "2026-07-31T08:00:00.000Z",
    });
    expect(report.topNegativeTopics).toEqual(expect.arrayContaining([{ topic: "crashes", mentionCount: 2 }]));
  });

  it("keeps the report valid when some analyses fail", () => {
    const report = aggregateGameReport({
      game: { steamAppId: 730, name: "Counter-Strike 2" },
      records: [
        reviewRecord({ id: "1", recommended: false, analysisStatus: "failed" }),
        reviewRecord({ id: "2", recommended: true, analysis: featureAnalysis }),
      ],
      dateRange: { from: null, to: null },
      generatedAt: "2026-07-31T08:00:00.000Z",
    });

    expect(report.statistics).toMatchObject({
      reviewsCollected: 2,
      reviewsAnalyzed: 1,
      positiveReviews: 1,
      negativeReviews: 1,
      actionableReviews: 1,
    });
    expect(report.topIssues).toEqual([]);
    expect(report.topFeatureRequests).toHaveLength(1);
  });
});
