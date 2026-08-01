import assert from "node:assert/strict";
import { test } from "node:test";

import { collectMappedProductReviews } from "../src/collection/collect-products.js";

const input = {
  products: [
    {
      productId: "example-product",
      name: "Example App",
      productType: "mobileApp",
      platforms: {
        googlePlay: { appId: "com.example.app", storeUrl: null },
        appleAppStore: { appId: "123456789", storeUrl: null },
      },
      releases: { android: null, ios: null },
    },
  ],
  countries: ["US"],
  languages: ["en"],
  maxReviewsPerPlatform: 10,
  includeReviewText: true,
  includeDeveloperReplies: true,
};

const googleRecord = {
  reviewId: "gp-1",
  appId: "com.example.app",
  rating: 2,
  reviewDateText: "July 31, 2026",
  text: "Android crash",
  helpfulCount: 4,
  developerReply: null,
  source: { country: "US", language: "en" },
};
const appleRecord = {
  reviewId: "ios-1",
  appId: "123456789",
  rating: 2,
  title: "Crash",
  text: "iOS crash",
  reviewDateText: "2026-07-31T08:00:00Z",
  appVersion: "4.2.0",
  helpfulCount: 3,
  developerReply: null,
  source: { country: "US", language: "en" },
};

test("collects mapped Google Play and Apple reviews independently with normalized source records", async () => {
  const result = await collectMappedProductReviews({
    input,
    collectors: {
      googlePlay: async () => ({
        records: [googleRecord],
        diagnostics: {
          url: "https://play.google.com/store/apps/details?id=com.example.app",
          collectedAt: "2026-08-01T00:00:00.000Z",
          httpStatus: 200,
        },
      }),
      appleAppStore: async () => ({
        records: [appleRecord],
        diagnostics: {
          url: "https://itunes.apple.com/us/rss/customerreviews/id=123456789/sortby=mostrecent/page=1/json",
          collectedAt: "2026-08-01T00:00:00.000Z",
          httpStatus: 200,
        },
      }),
    },
  });

  assert.equal(result.reviews.length, 2);
  assert.deepEqual(result.reviews.map((record) => record.platform.id).sort(), [
    "appleAppStore",
    "googlePlay",
  ]);
  assert.equal(result.reviews[0].product.productId, "example-product");
  assert.equal(result.diagnostics.length, 2);
  assert.equal(result.errors.length, 0);
  assert.equal(result.stats.googlePlayReviewsCollected, 1);
  assert.equal(result.stats.appleAppStoreReviewsCollected, 1);
});

test("preserves successful platform reviews when the other platform fails", async () => {
  const result = await collectMappedProductReviews({
    input,
    collectors: {
      googlePlay: async () => ({
        records: [googleRecord],
        diagnostics: {
          url: "https://play.google.com",
          collectedAt: "2026-08-01T00:00:00.000Z",
          httpStatus: 200,
        },
      }),
      appleAppStore: async () => ({
        records: [],
        diagnostics: {
          url: "https://itunes.apple.com",
          collectedAt: "2026-08-01T00:00:00.000Z",
          httpStatus: 429,
        },
        error: {
          code: "APP_STORE_HTTP_ERROR",
          httpStatus: 429,
          message: "rate limited",
        },
      }),
    },
  });

  assert.equal(result.reviews.length, 1);
  assert.equal(result.reviews[0].platform.id, "googlePlay");
  assert.deepEqual(result.errors, [
    {
      productId: "example-product",
      platform: "appleAppStore",
      appId: "123456789",
      error: {
        code: "APP_STORE_HTTP_ERROR",
        httpStatus: 429,
        message: "rate limited",
      },
    },
  ]);
  assert.equal(result.stats.errors, 1);
});

test("applies rating and date filters before emitting normalized reviews", async () => {
  const result = await collectMappedProductReviews({
    input: {
      ...input,
      ratings: [5],
      dateRange: { from: "2026-08-01T00:00:00.000Z" },
    },
    collectors: {
      googlePlay: async () => ({
        records: [
          { ...googleRecord, rating: 5, reviewDateText: "July 31, 2026" },
        ],
        diagnostics: {},
      }),
      appleAppStore: async () => ({ records: [appleRecord], diagnostics: {} }),
    },
  });
  assert.equal(result.reviews.length, 0);
  assert.equal(result.stats.googlePlayReviewsCollected, 0);
  assert.equal(result.stats.appleAppStoreReviewsCollected, 0);
});
