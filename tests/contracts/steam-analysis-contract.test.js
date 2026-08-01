import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { analyzeReview } from "../../actors/steam-game-feedback-analyzer/src/analysis/analyze-review.js";
import { feedbackTypes, severities, topicIds } from "../../actors/steam-game-feedback-analyzer/src/config/taxonomy.js";

const fixtures = JSON.parse(await readFile(fileURLToPath(new URL("../../actors/steam-game-feedback-analyzer/test/fixtures/reviews/review-fixtures.json", import.meta.url)), "utf8"));

test("all labeled Steam analysis fixtures satisfy the strict output contract", () => {
  for (const fixture of fixtures) {
    const result = analyzeReview(fixture);
    assert.equal(typeof result.isActionableFeedback, "boolean", fixture.name);
    assert.ok(result.actionabilityScore >= 0 && result.actionabilityScore <= 1, fixture.name);
    assert.ok(feedbackTypes.includes(result.primaryFeedbackType), fixture.name);
    assert.ok(result.feedbackTypes.every((type) => feedbackTypes.includes(type)), fixture.name);
    assert.ok(["positive", "negative", "mixed", "neutral"].includes(result.sentiment), fixture.name);
    assert.ok(severities.includes(result.severity), fixture.name);
    assert.ok(result.topics.every((topic) => topicIds.includes(topic)), fixture.name);
    assert.equal(result.originalTextPreserved, true, fixture.name);
    assert.equal(result.modelMetadata.schemaVersion, "1.0", fixture.name);
  }
  assert.equal(fixtures.length, 12);
});

test("analysis failures remain represented as source reviews in the processing path", async () => {
  const { processGame } = await import("../../actors/steam-game-feedback-analyzer/src/runtime/process-game.js");
  const { createRunStatistics } = await import("../../actors/steam-game-feedback-analyzer/src/runtime/run-statistics.js");
  const pushed = [];
  const result = await processGame({
    appId: "730",
    input: {
      languages: ["english"],
      reviewFilter: "all",
      purchaseType: "all",
      dateRange: { from: null, to: null, recentDays: null },
      maxReviewsPerGame: 1,
      includeReviewText: true,
      analysis: { enabled: true },
    },
    client: {
      getGameDetails: async () => ({ steamAppId: 730, name: "Counter-Strike 2" }),
      fetchReviews: async () => [{ recommendationid: "failed", language: "english", review: "Bad game", voted_up: false, author: {} }],
    },
    analyze: async () => { throw new Error("ANALYSIS_SCHEMA_INVALID: fixture failure"); },
    statistics: createRunStatistics({ now: () => 0 }),
    pushData: async (record) => pushed.push(record),
  });

  assert.equal(result.records.length, 1);
  assert.equal(pushed.length, 1);
  assert.deepEqual(pushed[0].review.reviewId, "failed");
  assert.equal(pushed[0].analysisStatus, "failed");
  assert.equal(pushed[0].analysisError.code, "ANALYSIS_SCHEMA_INVALID");
});

