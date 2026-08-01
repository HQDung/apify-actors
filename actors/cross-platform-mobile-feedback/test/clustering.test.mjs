import assert from "node:assert/strict";
import { test } from "node:test";

import { clusterPlatformFeedback } from "../src/clustering/platform-clustering.js";

const analysis = (title) => ({
  analysisStatus: "success",
  isActionableFeedback: true,
  actionabilityScore: 0.9,
  primaryFeedbackType: "bugReport",
  feedbackTypes: ["bugReport"],
  sentiment: "negative",
  severity: "high",
  topics: ["crash", "login"],
  summary: title,
  issue: { title, reproductionConfidence: 0.8 },
  featureRequest: null,
});

const entry = ({
  platform,
  reviewId,
  title = "Crash during login",
  status = "success",
}) => ({
  review: {
    product: {
      productId: "example-product",
      name: "Example App",
      productType: "mobileApp",
    },
    platform: {
      id: platform,
      appId: platform === "googlePlay" ? "com.example.app" : "123456789",
    },
    review: { reviewId },
  },
  normalizedFeedback: {
    source: {
      platform: platform === "googlePlay" ? "google-play" : "apple-app-store",
      sourceRecordId: reviewId,
    },
    product: {
      productId: "example-product",
      productType: "app",
      name: "Example App",
    },
    feedback: {
      sourceLanguage: platform === "googlePlay" ? "en" : "vi",
      createdAt: "2026-07-31T00:00:00.000Z",
    },
    environmentContext: {
      countryCode: platform === "googlePlay" ? "US" : "VN",
      appVersion: platform === "googlePlay" ? "4.2.0" : "4.2.1",
    },
  },
  analysis:
    status === "success" ? analysis(title) : { analysisStatus: "failed" },
});

test("clusters Android and iOS separately without cross-platform mixing", () => {
  const result = clusterPlatformFeedback({
    analysisRecords: [
      entry({ platform: "googlePlay", reviewId: "android-1" }),
      entry({
        platform: "googlePlay",
        reviewId: "android-2",
        title: "Login crashes app",
      }),
      entry({ platform: "appleAppStore", reviewId: "ios-1" }),
      entry({
        platform: "appleAppStore",
        reviewId: "ios-2",
        title: "Login crashes app",
      }),
    ],
    minimumClusterSize: 2,
  });

  assert.equal(result.clusters.length, 2);
  assert.deepEqual(
    result.clusters.map((cluster) => cluster.platform.id).sort(),
    ["appleAppStore", "googlePlay"],
  );
  assert.ok(
    result.clusters.every((cluster) =>
      cluster.reviewIds.every((id) =>
        id.startsWith(cluster.platform.id === "googlePlay" ? "android" : "ios"),
      ),
    ),
  );
  assert.notEqual(result.clusters[0].clusterId, result.clusters[1].clusterId);
  assert.equal(
    result.reviewClusterIds["googlePlay:android-1"],
    result.reviewClusterIds["googlePlay:android-2"],
  );
  assert.equal(
    result.reviewClusterIds["appleAppStore:ios-1"],
    result.reviewClusterIds["appleAppStore:ios-2"],
  );
});

test("retains platform dimensions and excludes failed analyses", () => {
  const result = clusterPlatformFeedback({
    analysisRecords: [
      entry({ platform: "googlePlay", reviewId: "android-1" }),
      entry({
        platform: "googlePlay",
        reviewId: "android-failed",
        status: "failed",
      }),
    ],
    minimumClusterSize: 1,
  });
  assert.equal(result.clusters.length, 1);
  assert.deepEqual(result.clusters[0].languages, ["en"]);
  assert.deepEqual(result.clusters[0].countries, ["US"]);
  assert.deepEqual(result.clusters[0].affectedVersions, ["4.2.0"]);
  assert.deepEqual(result.clusters[0].reviewIds, ["android-1"]);
  assert.equal(result.reviewClusterIds["googlePlay:android-failed"], undefined);
});
