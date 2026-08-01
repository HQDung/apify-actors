import {
  analyzeCollectedReviews,
  CROSS_PLATFORM_TAXONOMY,
} from "../src/analysis/cross-platform-analysis.js";
import { clusterPlatformFeedback } from "../src/clustering/platform-clustering.js";
import { comparePlatformClusters } from "../src/comparison/compare-platform-clusters.js";
import { buildReleaseComparisonReport } from "../src/release/build-release-comparison-report.js";
import { buildCrossPlatformReport } from "../src/report/build-cross-platform-report.js";

export const product = {
  productId: "benchmark-product",
  name: "Benchmark App",
  productType: "mobileApp",
  platforms: {
    googlePlay: { appId: "com.example.benchmark", storeUrl: null },
    appleAppStore: { appId: "987654321", storeUrl: null },
  },
  releases: {
    android: { version: "4.2.0", releasedAt: "2026-07-20T00:00:00.000Z" },
    ios: { version: "4.2.0", releasedAt: "2026-07-22T00:00:00.000Z" },
  },
};

const sharedFamilies = [
  {
    key: "login-crash",
    feedbackType: "bugReport",
    topics: ["crash", "login"],
    severity: "high",
    titles: {
      googlePlay: "Login crash on Android",
      appleAppStore: "Login crash on iOS",
    },
  },
  {
    key: "subscription-payment",
    feedbackType: "paymentIssue",
    topics: ["payment", "subscription"],
    severity: "high",
    titles: {
      googlePlay: "Subscription payment fails",
      appleAppStore: "Payment fails for subscriptions",
    },
  },
  {
    key: "slow-loading",
    feedbackType: "performanceIssue",
    topics: ["loading", "performance"],
    severity: "medium",
    titles: {
      googlePlay: "Slow loading in app",
      appleAppStore: "Slow loading in every screen",
    },
  },
  {
    key: "offline-mode",
    feedbackType: "featureRequest",
    topics: ["featureRequest", "performance"],
    severity: "medium",
    titles: {
      googlePlay: "Offline access request",
      appleAppStore: "Offline access option",
    },
  },
  {
    key: "dark-mode",
    feedbackType: "featureRequest",
    topics: ["featureRequest", "userInterface"],
    severity: "low",
    titles: {
      googlePlay: "Dark theme request",
      appleAppStore: "Dark theme option",
    },
  },
];

const androidOnlyFamilies = [
  [
    "android-battery",
    "performanceIssue",
    ["battery"],
    "Battery drains in background",
  ],
  [
    "android-permissions",
    "usabilityIssue",
    ["permissions"],
    "Camera permission is blocked",
  ],
  [
    "android-compatibility",
    "bugReport",
    ["compatibility"],
    "App is incompatible with this Android device",
  ],
  [
    "android-notifications",
    "accountIssue",
    ["notifications"],
    "Notifications arrive late on Android",
  ],
  [
    "android-sync",
    "performanceIssue",
    ["sync", "network"],
    "Android sync does not finish",
  ],
].map(([key, feedbackType, topics, title]) => ({
  key,
  feedbackType,
  topics,
  severity: "medium",
  titles: { googlePlay: title },
}));

const iosOnlyFamilies = [
  [
    "ios-purchase-restore",
    "pricingFeedback",
    ["pricing"],
    "Restore purchases does not work",
  ],
  ["ios-face-id", "accountIssue", ["accessibility"], "Face ID sign-in fails"],
  [
    "ios-keyboard",
    "usabilityIssue",
    ["userInterface"],
    "The iOS keyboard covers the form",
  ],
  ["ios-widget", "bugReport", ["dataLoss"], "The home screen widget is stale"],
  ["ios-sharing", "stabilityIssue", ["crash"], "The iOS share sheet crashes"],
].map(([key, feedbackType, topics, title]) => ({
  key,
  feedbackType,
  topics,
  severity: "medium",
  titles: { appleAppStore: title },
}));

const families = [
  ...sharedFamilies,
  ...androidOnlyFamilies,
  ...iosOnlyFamilies,
];
const familyByKey = new Map(families.map((family) => [family.key, family]));
const sharedKeys = new Set(sharedFamilies.map((family) => family.key));
const androidOnlyKeys = new Set(
  androidOnlyFamilies.map((family) => family.key),
);
const iosOnlyKeys = new Set(iosOnlyFamilies.map((family) => family.key));

const platformConfig = {
  googlePlay: {
    sourcePlatform: "google-play",
    appId: product.platforms.googlePlay.appId,
    releaseAt: "2026-07-20T00:00:00.000Z",
    rating: 2,
  },
  appleAppStore: {
    sourcePlatform: "apple-app-store",
    appId: product.platforms.appleAppStore.appId,
    releaseAt: "2026-07-22T00:00:00.000Z",
    rating: 4,
  },
};

const createdAtFor = (platform, index) => {
  const config = platformConfig[platform];
  if (index < 2)
    return platform === "googlePlay"
      ? "2026-07-19T12:00:00.000Z"
      : "2026-07-21T12:00:00.000Z";
  return config.releaseAt.replace("T00:00:00.000Z", "T12:00:00.000Z");
};

const createReview = (platform, family, index) => {
  const config = platformConfig[platform];
  const language = index % 2 === 0 ? "en" : "vi";
  const country = index < 3 ? "US" : "VN";
  const title = family.titles[platform];
  const reviewId = `${platform}-${family.key}-${index}`;
  return {
    recordType: "review",
    product,
    platform: { id: platform, appId: config.appId, storeUrl: null },
    review: {
      reviewId,
      rating: config.rating,
      title,
      text: `[benchmark:${family.key}] ${language === "vi" ? "Ứng dụng gặp vấn đề." : "The app has this issue."} ${title}`,
      sourceLanguage: language,
      countryCode: country,
      createdAt: createdAtFor(platform, index),
      updatedAt: null,
      appVersion: "4.2.0",
      helpfulCount: 1,
    },
    developerReply: { text: null, createdAt: null },
    environmentContext: {
      device: null,
      operatingSystem: platform === "googlePlay" ? "Android" : "iOS",
      authenticationMethod: null,
    },
    source: {
      sourceUrl: null,
      collectedAt: "2026-08-01T00:00:00.000Z",
    },
  };
};

export const createFixture = () => {
  const reviews = [];
  const familyByReviewId = new Map();
  for (const platform of ["googlePlay", "appleAppStore"]) {
    const platformFamilies = families.filter(
      (family) => family.titles[platform],
    );
    for (const family of platformFamilies) {
      for (let index = 0; index < 5; index += 1) {
        const review = createReview(platform, family, index);
        reviews.push(review);
        familyByReviewId.set(review.review.reviewId, family.key);
      }
    }
  }
  return { reviews, familyByReviewId };
};

export const providerFor = async ({ feedback }) => {
  const key = String(feedback.feedback.text).match(
    /\[benchmark:([^\]]+)\]/,
  )?.[1];
  const family = familyByKey.get(key);
  if (!family) throw new Error(`Unknown benchmark family: ${key}`);
  const isFeatureRequest = family.feedbackType === "featureRequest";
  const title =
    family.titles[
      feedback.source.platform === "google-play"
        ? "googlePlay"
        : "appleAppStore"
    ];
  return {
    result: {
      isActionableFeedback: true,
      actionabilityScore: 0.9,
      primaryFeedbackType: family.feedbackType,
      feedbackTypes: [family.feedbackType],
      sentiment: isFeatureRequest ? "neutral" : "negative",
      severity: family.severity,
      topics: family.topics,
      summary: title,
      issue: isFeatureRequest ? null : { title, reproductionConfidence: 0.9 },
      featureRequest: isFeatureRequest
        ? { title, demandConfidence: 0.9 }
        : null,
      positiveSignals: [],
      sourceLanguage: feedback.feedback.sourceLanguage,
      analysisLanguage: "english",
      originalTextPreserved: true,
      modelMetadata: {
        provider: "quality-benchmark",
        model: "fixture-v1",
        schemaVersion: "1.0",
      },
    },
    usage: { inputTokens: 120, outputTokens: 80, estimatedCost: 0.0002 },
  };
};

const ratio = (numerator, denominator) =>
  denominator === 0 ? 1 : Number((numerator / denominator).toFixed(4));

const familyForCluster = (cluster, familyByReviewId) =>
  familyByReviewId.get(cluster.reviewIds[0]);

export const runQualityBenchmark = async () => {
  const startedAt = performance.now();
  const fixture = createFixture();
  const analysis = await analyzeCollectedReviews({
    reviews: fixture.reviews,
    provider: providerFor,
    options: { outputLanguage: "english", maxAttempts: 1 },
    cacheMaxEntries: 1000,
  });
  const clustering = clusterPlatformFeedback({
    analysisRecords: analysis.analysisRecords,
    minimumClusterSize: 2,
  });
  const clusterKeys = new Map(
    clustering.clusters.map((cluster) => [
      cluster.clusterId,
      familyForCluster(cluster, fixture.familyByReviewId),
    ]),
  );
  const coherentClusters = clustering.clusters.filter(
    (cluster) =>
      new Set(cluster.reviewIds.map((id) => fixture.familyByReviewId.get(id)))
        .size === 1,
  );
  const comparisons = comparePlatformClusters({
    product,
    clusters: clustering.clusters,
    minimumSharedClusterConfidence: 0.75,
    minimumPlatformSpecificMentions: 2,
    platformEvidence: {
      googlePlayReviewsCollected: 50,
      appleAppStoreReviewsCollected: 50,
    },
  }).comparisons;
  const sharedComparisons = comparisons.filter((comparison) =>
    ["shared", "platformDominantAndroid", "platformDominantIos"].includes(
      comparison.classification,
    ),
  );
  const correctSharedComparisons = sharedComparisons.filter((comparison) => {
    if (comparison.classification !== "shared") return false;
    const androidKey = clusterKeys.get(comparison.androidClusterId);
    const iosKey = clusterKeys.get(comparison.iosClusterId);
    return androidKey === iosKey && sharedKeys.has(androidKey);
  });
  const platformSpecificComparisons = comparisons.filter((comparison) =>
    ["androidOnly", "iosOnly"].includes(comparison.classification),
  );
  const correctPlatformSpecificComparisons = platformSpecificComparisons.filter(
    (comparison) => {
      const key = clusterKeys.get(comparison.clusterId);
      return (
        (comparison.classification === "androidOnly" &&
          androidOnlyKeys.has(key)) ||
        (comparison.classification === "iosOnly" && iosOnlyKeys.has(key))
      );
    },
  );
  const report = buildCrossPlatformReport({
    product,
    reviews: fixture.reviews,
    analysisRecords: analysis.analysisRecords,
    comparisons,
    platformEvidence: {
      googlePlayReviewsCollected: 50,
      appleAppStoreReviewsCollected: 50,
    },
    minimumDimensionReviews: 5,
    generatedAt: "2026-08-01T00:00:00.000Z",
  });
  const release = buildReleaseComparisonReport({
    product,
    analysisRecords: analysis.analysisRecords,
    daysBefore: 2,
    daysAfter: 2,
    minimumReleaseReviews: 5,
    generatedAt: "2026-08-01T00:00:00.000Z",
  });
  const countryInsight = new Map(
    report.countryInsights.map((entry) => [entry.countryCode, entry]),
  );
  const languageInsight = new Map(
    report.languageInsights.map((entry) => [entry.language, entry]),
  );
  const countryAccuracy = ["US", "VN"].every((country) => {
    const insight = countryInsight.get(country);
    const expectedCount =
      fixture.reviews.filter((review) => review.review.countryCode === country)
        .length / 2;
    return (
      insight?.android.reviewCount === expectedCount &&
      insight.ios.reviewCount === expectedCount
    );
  });
  const languageAccuracy = ["en", "vi"].every((language) => {
    const insight = languageInsight.get(language);
    const expectedCount =
      fixture.reviews.filter(
        (review) => review.review.sourceLanguage === language,
      ).length / 2;
    return (
      insight?.android.reviewCount === expectedCount &&
      insight.ios.reviewCount === expectedCount
    );
  });
  const releaseWindowAccuracy =
    release.platforms.android.statistics.beforeReviews === 20 &&
    release.platforms.android.statistics.afterReviews === 30 &&
    release.platforms.ios.statistics.beforeReviews === 20 &&
    release.platforms.ios.statistics.afterReviews === 30 &&
    release.platforms.android.windows.before.to <
      release.platforms.android.windows.after.from &&
    release.platforms.ios.windows.before.to <
      release.platforms.ios.windows.after.from;
  const runtimeMs = Number((performance.now() - startedAt).toFixed(2));
  const peakRssMb = Number(
    (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
  );

  return {
    dataset: {
      androidReviews: fixture.reviews.filter(
        (review) => review.platform.id === "googlePlay",
      ).length,
      iosReviews: fixture.reviews.filter(
        (review) => review.platform.id === "appleAppStore",
      ).length,
      rawCollectionSuccess: 1,
      knownSharedReviewPairs: 25,
      knownFeatureRequestPairs: 10,
      knownPlatformSpecificExamples: 50,
    },
    analysis: {
      analyzedReviews: analysis.analysisRecords.length,
      schemaValidity: ratio(
        analysis.analysisRecords.filter(
          (entry) => entry.analysis.analysisStatus === "success",
        ).length,
        analysis.analysisRecords.length,
      ),
    },
    clustering: {
      clusters: clustering.clusters.length,
      coherence: ratio(coherentClusters.length, clustering.clusters.length),
    },
    comparison: {
      comparisons: comparisons.length,
      predictedShared: sharedComparisons.length,
      expectedShared: sharedKeys.size,
      sharedPrecision: ratio(
        correctSharedComparisons.length,
        sharedComparisons.length,
      ),
      sharedRecall: ratio(correctSharedComparisons.length, sharedKeys.size),
      platformSpecificFalsePositiveRate: ratio(
        platformSpecificComparisons.length -
          correctPlatformSpecificComparisons.length,
        platformSpecificComparisons.length,
      ),
    },
    dimensions: {
      ratingDifference: report.platformDifferences.ratingDifference,
      countryAccuracy: countryAccuracy ? 1 : 0,
      languageAccuracy: languageAccuracy ? 1 : 0,
      versionAccuracy:
        report.versionInsights.length === 1 &&
        report.versionInsights[0].android.reviewCount === 50 &&
        report.versionInsights[0].ios.reviewCount === 50
          ? 1
          : 0,
    },
    release: {
      beforeAfterWindowAccuracy: releaseWindowAccuracy ? 1 : 0,
      warnings: release.warnings.length,
    },
    operational: {
      crossProductMatches: comparisons.filter(
        (comparison) => comparison.product?.productId !== product.productId,
      ).length,
      runtimeMs,
      peakRssMb,
    },
    cost: {
      estimatedProviderCost: analysis.usage.estimatedCost,
      estimatedCostPerProductComparison: analysis.usage.estimatedCost,
      inputTokens: analysis.usage.inputTokens,
      outputTokens: analysis.usage.outputTokens,
    },
    taxonomyTopics: CROSS_PLATFORM_TAXONOMY.topics.length,
  };
};

if (process.argv[1]?.endsWith("quality-benchmark.mjs")) {
  console.log(JSON.stringify(await runQualityBenchmark(), null, 2));
}
