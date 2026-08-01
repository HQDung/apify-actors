import { aggregateFeedback } from "../../../../packages/feedback-analysis-core/src/index.js";
import { toCoreAnalysisRecord } from "../core/steam-contract-adapter.js";

export const aggregateGameReport = ({ game, records, clusters = [], dateRange = {}, generatedAt = new Date().toISOString() }) => {
  const report = aggregateFeedback({
    product: { productId: String(game.steamAppId), productType: "game", name: game.name, version: null },
    records: records.map(toCoreAnalysisRecord),
    clusters,
    dateRange,
    generatedAt,
  });
  return {
    recordType: "gameFeedbackReport",
    game,
    reviewWindow: report.reviewWindow,
    statistics: {
      reviewsCollected: report.statistics.reviewsCollected,
      reviewsAnalyzed: report.statistics.reviewsAnalyzed,
      positiveReviews: report.statistics.positiveReviews,
      negativeReviews: report.statistics.negativeReviews,
      actionableReviews: report.statistics.actionableReviews,
      languages: report.statistics.languages,
    },
    topIssues: report.topIssues,
    topFeatureRequests: report.topFeatureRequests,
    topPositiveTopics: report.topPositiveTopics,
    topNegativeTopics: report.topNegativeTopics,
    localizationInsights: report.localizationInsights.map((entry) => ({ ...entry, summary: `Players with ${entry.language} review text mention localization or subtitle concerns.` })),
    generatedAt,
  };
};
