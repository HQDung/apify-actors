import { compareFeedbackWindows } from "@project/feedback-analysis-core";

import { toCoreAnalysisRecord } from "../core/steam-contract-adapter.js";

const dayMs = 24 * 60 * 60 * 1000;

export const buildPatchWindows = ({ releasedAt, daysBefore = 14, daysAfter = 14 }) => {
  const patchTime = new Date(releasedAt).getTime();
  const beforeFrom = new Date(patchTime - daysBefore * dayMs).toISOString();
  const beforeTo = new Date(patchTime - 1).toISOString();
  const afterFrom = new Date(patchTime).toISOString();
  const afterTo = new Date(patchTime + daysAfter * dayMs - 1).toISOString();
  return {
    before: { from: beforeFrom, to: beforeTo, recentDays: null },
    after: { from: afterFrom, to: afterTo, recentDays: null },
  };
};

export const comparePatchImpact = ({ game, patch, beforeRecords, afterRecords, windows = null, generatedAt = new Date().toISOString() }) => {
  const report = compareFeedbackWindows({
    product: { productId: String(game.steamAppId), productType: "game", name: game.name },
    beforeRecords: beforeRecords.map(toCoreAnalysisRecord),
    afterRecords: afterRecords.map(toCoreAnalysisRecord),
    windows,
    generatedAt,
  });
  return {
    recordType: "patchImpactReport",
    game,
    patch,
    windows,
    statistics: report.statistics,
    topicChanges: report.topicChanges,
    newIssues: report.newIssues,
    improvedTopics: report.improvedTopics,
    possibleRegressions: report.possibleRegressions,
    disclaimer: "Changes are observational comparisons of player reviews, not a causal confirmation that the patch caused an issue or improvement.",
    generatedAt,
  };
};
