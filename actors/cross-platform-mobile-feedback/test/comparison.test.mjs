import assert from "node:assert/strict";
import { test } from "node:test";

import { comparePlatformClusters } from "../src/comparison/compare-platform-clusters.js";

const product = {
  productId: "example-product",
  name: "Example App",
  productType: "mobileApp",
  platforms: {
    googlePlay: { appId: "com.example.app", storeUrl: null },
    appleAppStore: { appId: "123456789", storeUrl: null },
  },
};

const cluster = ({
  platform,
  clusterId,
  canonicalIssue,
  feedbackType = "bugReport",
  topics = ["crash", "login"],
  mentionCount = 10,
  productId = product.productId,
  severity = "high",
}) => ({
  recordType: "feedbackCluster",
  clusterId,
  productId,
  product: { productId, name: product.name, productType: "app" },
  platform: { id: platform },
  canonicalIssue,
  feedbackType,
  topics,
  mentionCount,
  uniqueReviewCount: mentionCount,
  severity,
  reviewIds: Array.from(
    { length: mentionCount },
    (_, index) => `${clusterId}-${index}`,
  ),
});

test("matches compatible clusters within the same explicit product", () => {
  const result = comparePlatformClusters({
    product,
    clusters: [
      cluster({
        platform: "googlePlay",
        clusterId: "android-login-crash",
        canonicalIssue: "Crash during login",
      }),
      cluster({
        platform: "appleAppStore",
        clusterId: "ios-login-crash",
        canonicalIssue: "Login crashes app",
        mentionCount: 8,
      }),
    ],
    minimumSharedClusterConfidence: 0.6,
    minimumPlatformSpecificMentions: 2,
    platformEvidence: {
      googlePlayReviewsCollected: 20,
      appleAppStoreReviewsCollected: 20,
    },
  });
  assert.equal(result.comparisons.length, 1);
  assert.equal(result.comparisons[0].classification, "shared");
  assert.equal(result.comparisons[0].androidClusterId, "android-login-crash");
  assert.equal(result.comparisons[0].iosClusterId, "ios-login-crash");
  assert.ok(result.comparisons[0].sharedConfidence >= 0.6);
});

test("does not match feature requests or unrelated generic sentiment", () => {
  const result = comparePlatformClusters({
    product,
    clusters: [
      cluster({
        platform: "googlePlay",
        clusterId: "android-feature",
        canonicalIssue: "Add offline mode",
        feedbackType: "featureRequest",
        topics: ["featureRequest"],
        mentionCount: 5,
      }),
      cluster({
        platform: "appleAppStore",
        clusterId: "ios-battery",
        canonicalIssue: "Battery drains in background",
        topics: ["battery"],
        mentionCount: 5,
      }),
    ],
    minimumPlatformSpecificMentions: 2,
    platformEvidence: {
      googlePlayReviewsCollected: 20,
      appleAppStoreReviewsCollected: 20,
    },
  });
  assert.equal(result.comparisons.length, 2);
  assert.ok(
    result.comparisons.every((comparison) =>
      ["androidOnly", "iosOnly"].includes(comparison.classification),
    ),
  );
  assert.ok(
    result.comparisons.every(
      (comparison) => comparison.observedOnlyInCollectedSample,
    ),
  );
});

test("emits insufficient evidence when a source is missing", () => {
  const result = comparePlatformClusters({
    product,
    clusters: [
      cluster({
        platform: "googlePlay",
        clusterId: "android-login-crash",
        canonicalIssue: "Crash during login",
      }),
    ],
    minimumPlatformSpecificMentions: 2,
    platformEvidence: {
      googlePlayReviewsCollected: 20,
      appleAppStoreReviewsCollected: 0,
    },
  });
  assert.equal(result.comparisons.length, 1);
  assert.equal(result.comparisons[0].classification, "insufficientEvidence");
  assert.equal(
    result.comparisons[0].warnings[0].code,
    "INSUFFICIENT_CROSS_PLATFORM_DATA",
  );
});

test("does not compare clusters from different products", () => {
  const result = comparePlatformClusters({
    product,
    clusters: [
      cluster({
        platform: "googlePlay",
        clusterId: "android-example",
        canonicalIssue: "Crash during login",
      }),
      cluster({
        platform: "appleAppStore",
        clusterId: "ios-other",
        productId: "other-product",
        canonicalIssue: "Crash during login",
      }),
    ],
    platformEvidence: {
      googlePlayReviewsCollected: 20,
      appleAppStoreReviewsCollected: 20,
    },
  });
  assert.equal(result.comparisons.length, 1);
  assert.equal(result.comparisons[0].classification, "androidOnly");
});
