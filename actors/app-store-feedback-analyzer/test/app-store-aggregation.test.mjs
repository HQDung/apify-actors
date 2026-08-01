import assert from "node:assert/strict";
import { test } from "node:test";

import { buildAppStoreAggregation } from "../src/aggregation/app-store-aggregation.js";

const record = ({ id, appId, createdAt = "2026-07-01T00:00:00.000Z" }) => ({
  source: {
    platform: "apple-app-store",
    sourceRecordId: id,
    collectedAt: "2026-08-01T00:00:00.000Z",
  },
  product: { productType: "app", productId: appId, name: null, version: null },
  feedback: {
    text: "The app crashes on launch.",
    sourceLanguage: "en",
    createdAt,
    isPositive: false,
    rating: 1,
  },
  environmentContext: { countryCode: "US", appVersion: null },
  analysis: {
    analysisStatus: "success",
    isActionableFeedback: true,
    actionabilityScore: 0.8,
    primaryFeedbackType: "bugReport",
    feedbackTypes: ["bugReport"],
    sentiment: "negative",
    severity: "high",
    topics: ["crash"],
    summary: "The app crashes on launch.",
    issue: { title: "Crash on launch" },
    featureRequest: null,
    positiveSignals: [],
    sourceLanguage: "en",
    analysisLanguage: "english",
    originalTextPreserved: true,
    modelMetadata: { provider: "test", model: "test", schemaVersion: "1.0" },
  },
});

test("aggregates each Apple app independently", () => {
  const records = buildAppStoreAggregation({
    coreRecords: [
      record({ id: "one-1", appId: "123456789" }),
      record({ id: "one-2", appId: "123456789" }),
      record({ id: "two-1", appId: "987654321" }),
    ],
    aggregation: { enabled: true, minimumClusterSize: 2 },
  });

  assert.equal(
    records.filter((entry) => entry.recordType === "feedbackCluster").length,
    1,
  );
  assert.equal(
    records.filter((entry) => entry.recordType === "productFeedbackReport")
      .length,
    2,
  );
  assert.deepEqual(
    records
      .filter((entry) => entry.recordType === "productFeedbackReport")
      .map((entry) => entry.product.productId)
      .sort(),
    ["123456789", "987654321"],
  );
});

test("emits an observational release report with non-overlapping windows", () => {
  const records = buildAppStoreAggregation({
    coreRecords: [
      record({
        id: "before",
        appId: "123456789",
        createdAt: "2026-07-19T10:00:00.000Z",
      }),
      record({
        id: "after",
        appId: "123456789",
        createdAt: "2026-07-20T10:00:00.000Z",
      }),
    ],
    aggregation: { enabled: true, minimumClusterSize: 2 },
    releaseImpact: { version: "4.2.0", releasedAt: "2026-07-20T00:00:00.000Z" },
    generatedAt: "2026-08-01T00:00:00.000Z",
  });

  const report = records.find(
    (entry) => entry.recordType === "feedbackImpactReport",
  );
  assert.equal(report.statistics.beforeReviews, 1);
  assert.equal(report.statistics.afterReviews, 1);
  assert.match(report.disclaimer, /not a causal confirmation/);
});
