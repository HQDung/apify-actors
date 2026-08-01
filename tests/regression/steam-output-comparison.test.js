import test from "node:test";
import assert from "node:assert/strict";

import { compareSteamOutputs } from "../../scripts/compare-steam-output.mjs";

const review = (overrides = {}) => ({
  recordType: "review",
  game: { steamAppId: 730, name: "Counter-Strike 2" },
  review: {
    reviewId: "review-1",
    language: "english",
    text: "The game crashes when opening the inventory.",
    recommended: false,
    ...overrides.review,
  },
  source: { platform: "steam", ...overrides.source },
  analysisStatus: "success",
  analysis: {
    primaryFeedbackType: "bugReport",
    feedbackTypes: ["bugReport", "stabilityIssue"],
    topics: ["crashes", "inventory"],
    summary: "candidate summary can differ",
    ...overrides.analysis,
  },
});

const cluster = (overrides = {}) => ({
  recordType: "feedbackCluster",
  clusterId: "issue-730-bugreport-crash-when-opening-inventory",
  game: { steamAppId: 730, name: "Counter-Strike 2" },
  feedbackType: "bugReport",
  mentionCount: 1,
  uniqueReviewCount: 1,
  reviewIds: ["review-1"],
  ...overrides,
});

const snapshot = ({ records = [review(), cluster()], report = {} } = {}) => ({
  records,
  reports: {
    GAME_730_REPORT: {
      recordType: "gameFeedbackReport",
      game: { steamAppId: 730 },
      statistics: { reviewsCollected: 1, reviewsAnalyzed: 1, ...report.statistics },
      generatedAt: "2026-08-01T04:00:00.000Z",
      ...report,
    },
  },
});

test("compares Steam snapshots while ignoring generated summaries and timestamps", () => {
  const baseline = snapshot();
  const candidate = snapshot({
    records: [
      review({ source: { scrapedAt: "2026-08-01T05:00:00.000Z" }, analysis: { summary: "new wording" } }),
      cluster(),
    ],
    report: { generatedAt: "2026-08-01T05:00:00.000Z" },
  });

  const result = compareSteamOutputs(baseline, candidate);

  assert.equal(result.valid, true);
  assert.deepEqual(result.summary.recordCounts, { baseline: { review: 1, feedbackCluster: 1 }, candidate: { review: 1, feedbackCluster: 1 } });
  assert.deepEqual(result.errors, []);
});

test("rejects missing review records and broken cluster links", () => {
  const result = compareSteamOutputs(
    snapshot(),
    snapshot({
      records: [review({ review: { reviewId: "review-2" } }), cluster({ reviewIds: ["missing-review"] })],
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("review IDs")));
  assert.ok(result.errors.some((error) => error.includes("cluster reviewIds")));
});

