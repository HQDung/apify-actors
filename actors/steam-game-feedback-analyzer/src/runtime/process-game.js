import { validateAnalysis } from "../analysis/analysis-schema.js";
import { analyzeReview } from "../analysis/analyze-review.js";
import { clusterReviews } from "../clustering/cluster-reviews.js";
import { normalizeReview } from "../steam/normalize-review.js";

export const processGame = async ({
  appId,
  input,
  client,
  statistics,
  pushData,
  analyze = analyzeReview,
  scrapedAt = new Date().toISOString(),
}) => {
  statistics.increment("reviewsRequested", input.maxReviewsPerGame);
  const game = await client.getGameDetails(appId);
  const rawReviews = await client.fetchReviews({
    appId,
    languages: input.languages,
    reviewFilter: input.reviewFilter,
    purchaseType: input.purchaseType,
    dateRange: input.dateRange,
    maxReviews: input.maxReviewsPerGame,
  });
  statistics.increment("reviewsCollected", rawReviews.length);

  const records = [];
  for (const review of rawReviews) {
    const record = normalizeReview({
      appId,
      game,
      review,
      includeReviewText: input.includeReviewText,
      scrapedAt,
    });
    if (input.analysis?.enabled || input.mode === "feedbackAnalysis") {
      statistics.increment("reviewsAnalyzed");
      try {
        record.analysis = validateAnalysis(
          await analyze({
            ...review,
            text: record.review.text ?? "",
            language: record.review.language,
            recommended: record.review.recommended,
            analysisLanguage: input.analysis?.outputLanguage ?? "english",
          }),
        );
        record.analysisStatus = "success";
        statistics.increment("analysesSucceeded");
      } catch (error) {
        record.analysisStatus = "failed";
        record.analysisError = {
          code: error.message.startsWith("ANALYSIS_SCHEMA_INVALID") ? "ANALYSIS_SCHEMA_INVALID" : "ANALYSIS_FAILED",
          message: error.message.replace(/^ANALYSIS_SCHEMA_INVALID:\s*/, "").slice(0, 240),
        };
        statistics.increment("analysesFailed");
      }
    }
    records.push(record);
  }
  let clusters = [];
  if (input.analysis?.enabled && input.analysis.clusterSimilarIssues) {
    const clustering = clusterReviews({
      records,
      minimumClusterSize: input.aggregation?.minimumClusterSize ?? 2,
    });
    clusters = clustering.clusters;
    for (const record of records) {
      const clusterId = clustering.reviewClusterIds[record.review.reviewId];
      if (clusterId) record.analysis.clusterId = clusterId;
    }
  }
  for (const record of records) {
    await pushData(record);
    statistics.increment("reviewsPushed");
  }
  return { game, records, clusters };
};
