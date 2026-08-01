import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCrossPlatformReport } from "../src/report/build-cross-platform-report.js";

const product = {
  productId: "example-product",
  name: "Example App",
  productType: "mobileApp",
  platforms: {
    googlePlay: { appId: "com.example.app", storeUrl: null },
    appleAppStore: { appId: "123456789", storeUrl: null },
  },
};

const review = ({
  platform,
  reviewId,
  rating,
  language,
  country,
  version,
}) => ({
  recordType: "review",
  product,
  platform: {
    id: platform,
    appId: platform === "googlePlay" ? "com.example.app" : "123456789",
  },
  review: {
    reviewId,
    rating,
    sourceLanguage: language,
    countryCode: country,
    appVersion: version,
    createdAt: "2026-07-31T00:00:00.000Z",
  },
});

const analysisEntry = ({ platform, reviewId, actionable = true }) => ({
  review: review({
    platform,
    reviewId,
    rating: platform === "googlePlay" ? 2 : 4,
    language: platform === "googlePlay" ? "en" : "vi",
    country: platform === "googlePlay" ? "US" : "VN",
    version: "4.2.0",
  }),
  normalizedFeedback: {
    source: {
      platform: platform === "googlePlay" ? "google-play" : "apple-app-store",
      sourceRecordId: reviewId,
      collectedAt: "2026-08-01T00:00:00.000Z",
    },
    product: {
      productId: product.productId,
      productType: "app",
      name: product.name,
    },
    feedback: {
      sourceLanguage: platform === "googlePlay" ? "en" : "vi",
      createdAt: "2026-07-31T00:00:00.000Z",
      rating: platform === "googlePlay" ? 2 : 4,
      isPositive: platform === "appleAppStore",
    },
    environmentContext: {
      countryCode: platform === "googlePlay" ? "US" : "VN",
      appVersion: "4.2.0",
    },
  },
  analysis: {
    analysisStatus: "success",
    isActionableFeedback: actionable,
    primaryFeedbackType: actionable ? "bugReport" : "positiveFeedback",
    topics: ["crash"],
    sentiment: actionable ? "negative" : "positive",
  },
});

test("builds a validated report with platform statistics and comparisons", () => {
  const report = buildCrossPlatformReport({
    product,
    reviews: [
      review({
        platform: "googlePlay",
        reviewId: "gp-1",
        rating: 2,
        language: "en",
        country: "US",
        version: "4.2.0",
      }),
      review({
        platform: "appleAppStore",
        reviewId: "ios-1",
        rating: 4,
        language: "vi",
        country: "US",
        version: "4.2.0",
      }),
    ],
    analysisRecords: [
      analysisEntry({ platform: "googlePlay", reviewId: "gp-1" }),
      analysisEntry({
        platform: "appleAppStore",
        reviewId: "ios-1",
        actionable: false,
      }),
    ],
    comparisons: [
      {
        recordType: "crossPlatformComparison",
        classification: "shared",
        canonicalIssue: "Crash during login",
        feedbackType: "bugReport",
        topics: ["crash"],
        severity: "high",
        androidClusterId: "gp-cluster",
        iosClusterId: "ios-cluster",
        androidMentions: 3,
        iosMentions: 2,
        sharedConfidence: 0.9,
        comparisonId: "example-product-shared-crash-during-login",
        reasons: ["matching feedback type"],
        warnings: [],
        product,
      },
    ],
    platformEvidence: {
      googlePlayReviewsCollected: 1,
      appleAppStoreReviewsCollected: 1,
    },
    minimumDimensionReviews: 1,
    dateRange: { from: null, to: null },
    generatedAt: "2026-08-01T00:00:00.000Z",
  });
  assert.equal(report.recordType, "crossPlatformFeedbackReport");
  assert.deepEqual(report.statistics, {
    googlePlayReviewsCollected: 1,
    appleAppStoreReviewsCollected: 1,
    googlePlayActionableReviews: 1,
    appleAppStoreActionableReviews: 0,
    googlePlayAverageRating: 2,
    appleAppStoreAverageRating: 4,
  });
  assert.equal(report.sharedIssues.length, 1);
  assert.equal(report.platformDifferences.ratingDifference, -2);
  assert.deepEqual(report.warnings, []);
  assert.equal(report.countryInsights[0].evidenceStatus, "sufficient");
  assert.equal(
    report.languageInsights[0].languageAttribution,
    "requested_store_locale_not_reviewer_origin",
  );
});

test("warns when one platform has no collected reviews", () => {
  const report = buildCrossPlatformReport({
    product,
    reviews: [
      review({
        platform: "googlePlay",
        reviewId: "gp-1",
        rating: 2,
        language: "en",
        country: "US",
        version: "4.2.0",
      }),
    ],
    analysisRecords: [
      analysisEntry({ platform: "googlePlay", reviewId: "gp-1" }),
    ],
    comparisons: [],
    platformEvidence: {
      googlePlayReviewsCollected: 1,
      appleAppStoreReviewsCollected: 0,
    },
    dateRange: { from: null, to: null },
    generatedAt: "2026-08-01T00:00:00.000Z",
  });
  assert.ok(report.warnings.some((warning) => warning.platform === "ios"));
  assert.equal(report.statistics.appleAppStoreAverageRating, null);
  assert.equal(report.countryInsights[0].evidenceStatus, "limited");
});
