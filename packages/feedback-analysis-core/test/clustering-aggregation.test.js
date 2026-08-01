import test from "node:test";
import assert from "node:assert/strict";

import {
  aggregateFeedback,
  clusterFeedback,
  compareFeedbackWindows,
  createClusterId,
} from "../src/index.js";

const analysis = ({ title = "Reported crash during login", topics = ["crash", "authentication"], type = "bugReport", sentiment = "negative", severity = "high", status = "success" } = {}) => ({
  analysisStatus: status,
  isActionableFeedback: status === "success",
  actionabilityScore: 0.8,
  primaryFeedbackType: type,
  feedbackTypes: [type],
  sentiment,
  severity,
  topics,
  summary: title,
  issue: type === "featureRequest" ? null : { title, reproductionConfidence: 0.7 },
  featureRequest: type === "featureRequest" ? { title } : null,
});

const record = ({ id, productId = "app-1", title, createdAt = "2026-07-20T00:00:00.000Z", topics, type, status } = {}) => ({
  source: { sourceRecordId: id },
  product: { productId, productType: "app", name: productId },
  feedback: { sourceLanguage: "english", createdAt, text: `${id} text` },
  environmentContext: { countryCode: "US", appVersion: "1.0" },
  analysis: analysis({ title, topics, type, status }),
});

test("clusters similar feedback within a product and feedback type only", () => {
  const result = clusterFeedback({
    records: [
      record({ id: "1", title: "Reported crash during login", topics: ["crash", "authentication"] }),
      record({ id: "2", title: "Login causes a crash", topics: ["crash", "authentication"] }),
      record({ id: "3", productId: "app-2", title: "Login causes a crash", topics: ["crash", "authentication"] }),
    ],
    minimumClusterSize: 1,
  });

  assert.equal(result.clusters.length, 2);
  assert.equal(result.clusters.find((cluster) => cluster.productId === "app-1").mentionCount, 2);
  assert.equal(result.clusters.find((cluster) => cluster.productId === "app-2").mentionCount, 1);
  assert.equal(result.reviewClusterIds["1"], result.reviewClusterIds["2"]);
  assert.notEqual(result.reviewClusterIds["1"], result.reviewClusterIds["3"]);
  assert.equal(createClusterId({ productId: "app-1", feedbackType: "bugReport", title: "Reported crash during login" }), "issue-app-1-bugreport-reported-crash-during-login");
});

test("aggregates report totals, topics, languages, and partial failures", () => {
  const report = aggregateFeedback({
    product: { productId: "app-1", productType: "app", name: "Example" },
    records: [
      record({ id: "1", title: "Reported crash during login", topics: ["crash", "authentication"] }),
      record({ id: "2", title: "Add biometric login", type: "featureRequest", topics: ["authentication"] }),
      record({ id: "3", status: "failed", title: null }),
    ],
    clusters: [],
    dateRange: { from: null, to: null },
    generatedAt: "2026-08-01T00:00:00.000Z",
  });

  assert.deepEqual(report.statistics, {
    reviewsCollected: 3,
    reviewsAnalyzed: 2,
    actionableReviews: 2,
    positiveReviews: 0,
    negativeReviews: 0,
    languages: { english: 3 },
    countries: { US: 3 },
    versions: { "1.0": 3 },
    averageRating: null,
  });
  assert.equal(report.topIssues[0].mentionCount, 1);
  assert.equal(report.topFeatureRequests[0].title, "Add biometric login");
  assert.equal(report.generatedAt, "2026-08-01T00:00:00.000Z");
});

test("compares bounded windows without claiming causation", () => {
  const report = compareFeedbackWindows({
    product: { productId: "app-1", name: "Example" },
    beforeRecords: [record({ id: "before", topics: ["crash"] })],
    afterRecords: [record({ id: "after-1", topics: ["crash"] }), record({ id: "after-2", topics: ["crash"] })],
    windows: { before: { from: "2026-07-01", to: "2026-07-19" }, after: { from: "2026-07-20", to: "2026-07-31" } },
    generatedAt: "2026-08-01T00:00:00.000Z",
  });

  assert.equal(report.statistics.beforeReviews, 1);
  assert.equal(report.statistics.afterReviews, 2);
  assert.ok(report.possibleRegressions.some((entry) => entry.topic === "crash"));
  assert.match(report.disclaimer, /not a causal confirmation/);
});
