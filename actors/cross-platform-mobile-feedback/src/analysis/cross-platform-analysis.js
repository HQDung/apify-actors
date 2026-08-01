import {
  analyzeFeedback,
  createTaxonomyConfig,
  createUsageStats,
} from "@project/feedback-analysis-core";

import { toNormalizedFeedback } from "../core/cross-platform-contract-adapter.js";

export const CROSS_PLATFORM_TAXONOMY = createTaxonomyConfig({
  feedbackTypes: [
    "bugReport",
    "performanceIssue",
    "stabilityIssue",
    "featureRequest",
    "usabilityIssue",
    "accessibilityFeedback",
    "localizationIssue",
    "accountIssue",
    "paymentIssue",
    "subscriptionIssue",
    "pricingFeedback",
    "positiveFeedback",
    "generalComplaint",
    "nonActionable",
    "spamOrIrrelevant",
  ],
  topics: [
    "crash",
    "freeze",
    "performance",
    "loading",
    "network",
    "login",
    "account",
    "payment",
    "subscription",
    "pricing",
    "advertising",
    "dataLoss",
    "notifications",
    "sync",
    "permissions",
    "compatibility",
    "userInterface",
    "accessibility",
    "localization",
    "customerSupport",
    "featureRequest",
    "battery",
  ],
  promptContext:
    "cross-platform mobile app reviews from Google Play and Apple App Store",
});

const cacheKeyFor = (feedback, options) =>
  JSON.stringify({
    productId: feedback.product.productId,
    platform: feedback.source.platform,
    reviewId: feedback.source.sourceRecordId,
    text: feedback.feedback.text,
    sourceLanguage: feedback.feedback.sourceLanguage,
    outputLanguage: options.outputLanguage ?? "english",
  });

export const normalizeReviewForAnalysis = (review) =>
  toNormalizedFeedback({ record: review });

const createCache = (maxEntries) => {
  const entries = new Map();
  return {
    get(key) {
      return entries.get(key);
    },
    set(key, value) {
      if (entries.has(key)) entries.delete(key);
      entries.set(key, value);
      while (entries.size > maxEntries)
        entries.delete(entries.keys().next().value);
    },
  };
};

export const analyzeCollectedReviews = async ({
  reviews,
  provider,
  fallback,
  options = {},
  logger = {},
  usage,
  cacheMaxEntries = 1000,
}) => {
  const stats = usage ?? createUsageStats();
  const cache = createCache(Math.max(1, cacheMaxEntries));
  const analysisRecords = [];
  const normalizedFeedback = [];

  for (const review of reviews) {
    try {
      const feedback = normalizeReviewForAnalysis(review);
      normalizedFeedback.push(feedback);
      const key = cacheKeyFor(feedback, options);
      const cached = cache.get(key);
      if (cached) {
        analysisRecords.push({
          review,
          normalizedFeedback: feedback,
          analysis: cached,
          cacheHit: true,
        });
        continue;
      }
      const analysis = await analyzeFeedback({
        feedback,
        taxonomy: CROSS_PLATFORM_TAXONOMY,
        provider,
        fallback,
        options,
        logger,
        usage: stats,
      });
      cache.set(key, analysis);
      analysisRecords.push({
        review,
        normalizedFeedback: feedback,
        analysis,
        cacheHit: false,
      });
    } catch (error) {
      analysisRecords.push({
        review,
        normalizedFeedback: null,
        analysis: {
          analysisStatus: "failed",
          analysisError: {
            code: error.code ?? "ANALYSIS_INPUT_ERROR",
            message: error.message.slice(0, 240),
          },
        },
        cacheHit: false,
      });
    }
  }

  return {
    reviews,
    normalizedFeedback,
    analysisRecords,
    usage: stats.summary(),
  };
};

export { cacheKeyFor };
