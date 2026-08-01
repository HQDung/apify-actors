import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { normalizeInput } from "../src/input/normalize-input.js";
import { buildReleaseComparisonReport } from "../src/release/build-release-comparison-report.js";
import { buildCrossPlatformReport } from "../src/report/build-cross-platform-report.js";

const mapping = {
  productId: "readiness-product",
  name: "Readiness App",
  googlePlayAppId: "com.example.readiness",
  appleAppId: "246813579",
};

const product = {
  productId: mapping.productId,
  name: mapping.name,
  productType: "mobileApp",
  platforms: {
    googlePlay: { appId: mapping.googlePlayAppId, storeUrl: null },
    appleAppStore: { appId: mapping.appleAppId, storeUrl: null },
  },
  releases: {
    android: { version: "5.0.0", releasedAt: "2027-07-20T00:00:00.000Z" },
    ios: { version: "5.0.0", releasedAt: "2027-07-22T00:00:00.000Z" },
  },
};

const releaseEntry = (platform, createdAt) => ({
  normalizedFeedback: {
    source: {
      platform,
      sourceRecordId: `${platform}-${createdAt}`,
      collectedAt: "2026-08-01T00:00:00.000Z",
    },
    product: { productId: product.productId, productType: "app" },
    feedback: { createdAt, sourceLanguage: "en" },
    environmentContext: { appVersion: null, countryCode: "US" },
  },
  analysis: {
    analysisStatus: "success",
    isActionableFeedback: true,
    actionabilityScore: 0.8,
    primaryFeedbackType: "bugReport",
    feedbackTypes: ["bugReport"],
    sentiment: "negative",
    severity: "high",
    topics: ["crash"],
    summary: "Crash after release",
    issue: { title: "Crash after release" },
    featureRequest: null,
  },
});

test("accepts every supported mode and preserves explicit mappings", () => {
  for (const mode of [
    "rawReviews",
    "feedbackAnalysis",
    "comparePlatforms",
    "releaseComparison",
  ]) {
    const input = normalizeInput({
      mode,
      products: [
        {
          ...mapping,
          releases: {
            android: { version: "5.0.0", releasedAt: "2027-07-20" },
            ios: { version: "5.0.0", releasedAt: "2027-07-22" },
          },
        },
      ],
    });
    assert.equal(input.mode, mode);
    assert.equal(input.products[0].productId, mapping.productId);
  }
});

test("keeps future or incomplete release data observable through warnings", () => {
  const report = buildReleaseComparisonReport({
    product,
    analysisRecords: [
      releaseEntry("google-play", "2027-07-19T12:00:00.000Z"),
      releaseEntry("apple-app-store", "2027-07-21T12:00:00.000Z"),
    ],
    daysBefore: 2,
    daysAfter: 2,
    minimumReleaseReviews: 1,
  });
  assert.ok(
    report.warnings.some(
      (warning) => warning.code === "MISSING_APP_VERSION_METADATA",
    ),
  );
  assert.ok(
    report.warnings.some((warning) => warning.code === "LOW_RELEASE_SAMPLE"),
  );
  assert.ok(
    report.platforms.android.windows.before.to <
      report.platforms.android.windows.after.from,
  );
});

test("publishing artifacts expose report, error, and request-budget links", async () => {
  const inputSchema = JSON.parse(
    await readFile(new URL("../.actor/input_schema.json", import.meta.url)),
  );
  const outputSchema = JSON.parse(
    await readFile(new URL("../.actor/output_schema.json", import.meta.url)),
  );
  const readme = await readFile(
    new URL("../README.md", import.meta.url),
    "utf8",
  );

  assert.equal(inputSchema.properties.maxRequestsPerRun.minimum, 1);
  assert.ok(outputSchema.properties.reports);
  assert.ok(outputSchema.properties.releaseReports);
  assert.ok(outputSchema.properties.sourceErrors);
  assert.ok(outputSchema.properties.runStatistics);
  assert.match(readme, /Responsible use/i);
  assert.match(readme, /Quality benchmark/i);
  assert.match(readme, /No publication or pricing changes/i);
});

test("partial source reports retain a warning instead of failing the report", () => {
  const review = {
    recordType: "review",
    product,
    platform: {
      id: "googlePlay",
      appId: mapping.googlePlayAppId,
      storeUrl: null,
    },
    review: {
      reviewId: "android-1",
      rating: 2,
      sourceLanguage: "en",
      countryCode: "US",
      appVersion: "5.0.0",
      createdAt: "2027-07-19T12:00:00.000Z",
    },
  };
  const report = buildCrossPlatformReport({
    product,
    reviews: [review],
    analysisRecords: [],
    comparisons: [],
    platformEvidence: {
      googlePlayReviewsCollected: 1,
      appleAppStoreReviewsCollected: 0,
    },
    sourceErrors: [
      {
        platform: "appleAppStore",
        message: "rate limited",
      },
    ],
  });
  assert.ok(
    report.warnings.some(
      (warning) => warning.code === "SOURCE_PARTIAL_FAILURE",
    ),
  );
  assert.ok(report.warnings.some((warning) => warning.platform === "ios"));
});
