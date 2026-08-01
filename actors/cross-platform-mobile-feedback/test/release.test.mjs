import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildReleaseComparisonReport,
  buildReleaseWindows,
} from "../src/release/build-release-comparison-report.js";

const product = {
  productId: "example-product",
  name: "Example App",
  productType: "mobileApp",
  platforms: {
    googlePlay: { appId: "com.example.app", storeUrl: null },
    appleAppStore: { appId: "123456789", storeUrl: null },
  },
  releases: {
    android: { version: "4.2.0", releasedAt: "2026-07-20T00:00:00.000Z" },
    ios: { version: "4.2.0", releasedAt: "2026-07-22T00:00:00.000Z" },
  },
};

const entry = ({ platform, reviewId, createdAt, topic = "crash" }) => ({
  review: {
    product,
    platform: { id: platform },
    review: { reviewId, createdAt },
  },
  normalizedFeedback: {
    source: {
      platform: platform === "googlePlay" ? "google-play" : "apple-app-store",
      sourceRecordId: reviewId,
    },
    product: { productId: product.productId, productType: "app" },
    feedback: { createdAt, sourceLanguage: "en" },
    environmentContext: {
      countryCode: "US",
      appVersion: createdAt < "2026-07-20" ? "4.1.0" : "4.2.0",
    },
  },
  analysis: {
    analysisStatus: "success",
    isActionableFeedback: true,
    primaryFeedbackType: "bugReport",
    topics: [topic],
    sentiment: "negative",
    issue: { title: topic === "crash" ? "Crash after release" : "Login issue" },
    featureRequest: null,
  },
});

test("builds non-overlapping before/after windows for staggered releases", () => {
  const windows = buildReleaseWindows({
    releasedAt: "2026-07-20T00:00:00.000Z",
    daysBefore: 2,
    daysAfter: 3,
  });
  assert.equal(windows.before.to, "2026-07-19T23:59:59.999Z");
  assert.equal(windows.after.from, "2026-07-20T00:00:00.000Z");
  assert.equal(windows.after.to, "2026-07-22T23:59:59.999Z");
});

test("builds observational platform release results and warnings", () => {
  const report = buildReleaseComparisonReport({
    product,
    analysisRecords: [
      entry({
        platform: "googlePlay",
        reviewId: "gp-before",
        createdAt: "2026-07-19T12:00:00.000Z",
      }),
      entry({
        platform: "googlePlay",
        reviewId: "gp-after",
        createdAt: "2026-07-20T12:00:00.000Z",
      }),
      entry({
        platform: "appleAppStore",
        reviewId: "ios-before",
        createdAt: "2026-07-21T12:00:00.000Z",
      }),
      entry({
        platform: "appleAppStore",
        reviewId: "ios-after",
        createdAt: "2026-07-23T12:00:00.000Z",
        topic: "login",
      }),
    ],
    daysBefore: 2,
    daysAfter: 2,
    minimumReleaseReviews: 1,
    generatedAt: "2026-08-01T00:00:00.000Z",
  });
  assert.equal(report.recordType, "releaseComparisonReport");
  assert.equal(report.platforms.android.statistics.beforeReviews, 1);
  assert.equal(report.platforms.android.statistics.afterReviews, 1);
  assert.equal(report.platforms.ios.statistics.beforeReviews, 1);
  assert.equal(report.rolloutTiming.releaseLagDays, 2);
  assert.equal(report.warnings.length, 0);
  assert.match(report.disclaimer, /observational/);
});
