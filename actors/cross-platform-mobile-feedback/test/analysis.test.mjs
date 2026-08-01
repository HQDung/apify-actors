import assert from "node:assert/strict";
import { test } from "node:test";

import { ANALYSIS_SCHEMA_VERSION } from "@project/feedback-analysis-core";

import {
  analyzeCollectedReviews,
  CROSS_PLATFORM_TAXONOMY,
  normalizeReviewForAnalysis,
} from "../src/analysis/cross-platform-analysis.js";

const review = ({
  platform = "googlePlay",
  language = "en",
  reviewId = "review-1",
} = {}) => ({
  recordType: "review",
  product: {
    productId: "example-product",
    name: "Example App",
    productType: "mobileApp",
  },
  platform: {
    id: platform,
    appId: platform === "googlePlay" ? "com.example.app" : "123456789",
    storeUrl: null,
  },
  review: {
    reviewId,
    rating: 2,
    title: "Sign-in crash",
    text:
      language === "vi"
        ? "Ứng dụng bị lỗi khi đăng nhập."
        : "The app crashes during login.",
    sourceLanguage: language,
    countryCode: "US",
    createdAt: "2026-07-31T00:00:00.000Z",
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
  source: { sourceUrl: null, collectedAt: "2026-08-01T00:00:00.000Z" },
});

const validProviderResult = ({
  sourceLanguage = "en",
  analysisLanguage = "english",
} = {}) => ({
  isActionableFeedback: true,
  actionabilityScore: 0.9,
  primaryFeedbackType: "bugReport",
  feedbackTypes: ["bugReport"],
  sentiment: "negative",
  severity: "high",
  topics: ["login", "crash"],
  summary: "The app crashes during login.",
  issue: { title: "Crash during login", reproductionConfidence: 0.8 },
  featureRequest: null,
  positiveSignals: [],
  sourceLanguage,
  analysisLanguage,
  originalTextPreserved: true,
  modelMetadata: {
    provider: "test",
    model: "test",
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
  },
});

test("normalizes Android and iOS reviews into the shared analysis contract", () => {
  const android = normalizeReviewForAnalysis(
    review({ platform: "googlePlay" }),
  );
  const ios = normalizeReviewForAnalysis(review({ platform: "appleAppStore" }));
  assert.equal(android.product.productId, ios.product.productId);
  assert.equal(android.source.platform, "google-play");
  assert.equal(ios.source.platform, "apple-app-store");
  assert.equal(android.environmentContext.operatingSystem, "Android");
  assert.equal(ios.environmentContext.operatingSystem, "iOS");
  assert.equal(CROSS_PLATFORM_TAXONOMY.topics.includes("login"), true);
});

test("uses one taxonomy for equivalent English and Vietnamese feedback", async () => {
  const result = await analyzeCollectedReviews({
    reviews: [
      review({ platform: "googlePlay" }),
      review({
        platform: "appleAppStore",
        language: "vi",
        reviewId: "review-2",
      }),
    ],
    provider: async ({ feedback }) =>
      validProviderResult({ sourceLanguage: feedback.feedback.sourceLanguage }),
    options: { outputLanguage: "english", maxAttempts: 1 },
  });
  assert.equal(result.analysisRecords.length, 2);
  assert.deepEqual(
    result.analysisRecords.map((entry) => entry.analysis.primaryFeedbackType),
    ["bugReport", "bugReport"],
  );
  assert.deepEqual(
    result.analysisRecords.map((entry) => entry.analysis.topics),
    [
      ["login", "crash"],
      ["login", "crash"],
    ],
  );
  assert.equal(result.analysisRecords[1].analysis.sourceLanguage, "vi");
});

test("retains raw reviews and falls back after an invalid provider response", async () => {
  const result = await analyzeCollectedReviews({
    reviews: [review()],
    provider: async () => "invalid-json",
    options: { outputLanguage: "english", maxAttempts: 1 },
  });
  assert.equal(result.reviews.length, 1);
  assert.equal(result.analysisRecords.length, 1);
  assert.equal(result.analysisRecords[0].analysis.analysisStatus, "success");
  assert.equal(result.usage.providerAttempts, 1);
  assert.equal(result.usage.fallbackCount, 1);
});

test("bounds the per-run analysis cache", async () => {
  let providerCalls = 0;
  const result = await analyzeCollectedReviews({
    reviews: [review(), review()],
    provider: async () => {
      providerCalls += 1;
      return validProviderResult();
    },
    options: { outputLanguage: "english", maxAttempts: 1 },
    cacheMaxEntries: 1,
  });
  assert.equal(result.analysisRecords.length, 2);
  assert.equal(providerCalls, 1);
  assert.equal(result.analysisRecords[1].cacheHit, true);
});
