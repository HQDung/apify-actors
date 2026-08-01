import test from "node:test";
import assert from "node:assert/strict";

import { createSteamClient } from "../../actors/steam-game-feedback-analyzer/src/steam/steam-client.js";
import { processGame } from "../../actors/steam-game-feedback-analyzer/src/runtime/process-game.js";
import { createRunStatistics } from "../../actors/steam-game-feedback-analyzer/src/runtime/run-statistics.js";

test("bounded public Steam smoke preserves raw output and analysis", { skip: !process.env.RUN_STEAM_LIVE_SMOKE }, async () => {
  const pushed = [];
  const result = await processGame({
    appId: "730",
    input: {
      languages: ["english"],
      reviewFilter: "all",
      purchaseType: "all",
      dateRange: { from: null, to: null, recentDays: 30 },
      maxReviewsPerGame: 5,
      includeReviewText: true,
      analysis: { enabled: true, clusterSimilarIssues: false },
    },
    client: createSteamClient(),
    statistics: createRunStatistics(),
    pushData: async (record) => pushed.push(record),
  });

  assert.ok(result.records.length > 0);
  assert.equal(pushed.length, result.records.length);
  assert.ok(result.records.every((record) => record.recordType === "review" && record.source.platform === "steam"));
  assert.ok(result.records.every((record) => record.analysisStatus === "success" && record.analysis));
});

