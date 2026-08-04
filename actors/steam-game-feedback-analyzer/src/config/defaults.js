export const DEFAULT_INPUT = {
  steamAppIds: ["730"],
  mode: "feedbackAnalysis",
  languages: ["all"],
  reviewFilter: "all",
  purchaseType: "all",
  dateRange: { from: null, to: null, recentDays: 30 },
  maxReviewsPerGame: 100,
  includeReviewText: true,
  analysis: {
    enabled: true,
    outputLanguage: "english",
    includeSummary: true,
    includeTopics: true,
    includeSeverity: true,
    includeActionabilityScore: true,
    includeEnvironmentSignals: true,
    clusterSimilarIssues: true,
  },
  aggregation: {
    enabled: true,
    minimumClusterSize: 2,
    includeExampleReviews: true,
    maxExamplesPerTopic: 3,
  },
  proxyConfiguration: { useApifyProxy: false },
  debug: false,
};

export const SUPPORTED_MODES = ["rawReviews", "feedbackAnalysis", "patchImpact"];
export const SUPPORTED_REVIEW_FILTERS = ["all", "positive", "negative"];
export const SUPPORTED_PURCHASE_TYPES = ["all", "steamPurchasers", "nonSteamPurchasers"];
