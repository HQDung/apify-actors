import {
  createComparisonId,
  validateCrossPlatformComparison,
} from "@project/cross-platform-comparison-core";

const platformFor = (value) => (value === "appleAppStore" ? "ios" : "android");

const overlap = (left = [], right = []) => {
  const a = new Set(left);
  const b = new Set(right);
  const union = new Set([...a, ...b]).size;
  return union === 0
    ? 0
    : [...a].filter((value) => b.has(value)).length / union;
};

const tokens = (value) =>
  new Set(
    String(value ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2),
  );

const tokenOverlap = (left, right) => {
  const a = tokens(left);
  const b = tokens(right);
  const union = new Set([...a, ...b]).size;
  return union === 0
    ? 0
    : [...a].filter((value) => b.has(value)).length / union;
};

const severityCompatibility = (left, right) => {
  if (left === right) return 1;
  if (left === "unknown" || right === "unknown") return 0.7;
  return 0.4;
};

const candidateScore = (android, ios) => {
  if (android.feedbackType !== ios.feedbackType) return null;
  const topicOverlap = overlap(android.topics, ios.topics);
  const titleOverlap = tokenOverlap(android.canonicalIssue, ios.canonicalIssue);
  if (topicOverlap === 0 && titleOverlap === 0) return null;
  const confidence = Number(
    (
      topicOverlap * 0.5 +
      titleOverlap * 0.4 +
      severityCompatibility(android.severity, ios.severity) * 0.1
    ).toFixed(2),
  );
  return {
    confidence,
    topicOverlap,
    titleOverlap,
    reasons: [
      ...(android.feedbackType === ios.feedbackType
        ? ["matching feedback type"]
        : []),
      ...(topicOverlap > 0
        ? [`topic overlap ${(topicOverlap * 100).toFixed(0)}%`]
        : []),
      ...(titleOverlap > 0
        ? [`canonical issue overlap ${(titleOverlap * 100).toFixed(0)}%`]
        : []),
    ],
  };
};

const warningsFor = ({ platform, code, message }) => [
  { code, platform, message },
];

const evidenceFor = ({ platformEvidence, platform }) => {
  const count =
    platform === "android"
      ? platformEvidence.googlePlayReviewsCollected
      : platformEvidence.appleAppStoreReviewsCollected;
  const otherCount =
    platform === "android"
      ? platformEvidence.appleAppStoreReviewsCollected
      : platformEvidence.googlePlayReviewsCollected;
  return { count: count ?? 0, otherCount: otherCount ?? 0 };
};

const specificComparison = ({
  product,
  cluster,
  classification,
  comparisonConfidence,
  minimumPlatformSpecificMentions,
  platformEvidence,
  warning,
}) => {
  const platform = platformFor(cluster.platform.id);
  const evidence = evidenceFor({ platformEvidence, platform });
  const warnings = warning ? [warning] : [];
  if (evidence.otherCount === 0) {
    return validateCrossPlatformComparison({
      recordType: "crossPlatformComparison",
      product,
      comparisonId: createComparisonId({
        productId: product.productId,
        classification: "insufficientEvidence",
        canonicalIssue: cluster.canonicalIssue,
      }),
      classification: "insufficientEvidence",
      canonicalIssue: cluster.canonicalIssue,
      warnings:
        warnings.length > 0
          ? warnings
          : warningsFor({
              platform,
              code: "INSUFFICIENT_CROSS_PLATFORM_DATA",
              message: `No ${platform === "android" ? "iOS" : "Android"} reviews were collected.`,
            }),
    });
  }
  if (cluster.mentionCount < minimumPlatformSpecificMentions) {
    return validateCrossPlatformComparison({
      recordType: "crossPlatformComparison",
      product,
      comparisonId: createComparisonId({
        productId: product.productId,
        classification: "insufficientEvidence",
        canonicalIssue: cluster.canonicalIssue,
      }),
      classification: "insufficientEvidence",
      canonicalIssue: cluster.canonicalIssue,
      warnings:
        warnings.length > 0
          ? warnings
          : warningsFor({
              platform,
              code: "LOW_CLUSTER_EVIDENCE",
              message: `Cluster has ${cluster.mentionCount} mentions; at least ${minimumPlatformSpecificMentions} are required.`,
            }),
    });
  }

  const specific = {
    recordType: "crossPlatformComparison",
    product,
    comparisonId: createComparisonId({
      productId: product.productId,
      classification,
      canonicalIssue: cluster.canonicalIssue,
    }),
    classification,
    platform,
    canonicalIssue: cluster.canonicalIssue,
    feedbackType: cluster.feedbackType,
    topics: cluster.topics,
    mentionCount: cluster.mentionCount,
    severity: cluster.severity,
    comparisonConfidence,
    observedOnlyInCollectedSample: true,
    evidenceStatus:
      evidence.count >= minimumPlatformSpecificMentions
        ? "sufficient"
        : "limited",
    clusterId: cluster.clusterId,
    warnings,
  };
  return validateCrossPlatformComparison(specific);
};

export const comparePlatformClusters = ({
  product,
  clusters,
  minimumSharedClusterConfidence = 0.75,
  minimumPlatformSpecificMentions = 2,
  platformEvidence = {},
}) => {
  const productClusters = clusters.filter(
    (cluster) => cluster.productId === product.productId,
  );
  const android = productClusters.filter(
    (cluster) => cluster.platform?.id === "googlePlay",
  );
  const ios = productClusters.filter(
    (cluster) => cluster.platform?.id === "appleAppStore",
  );
  const candidates = [];
  for (const androidCluster of android) {
    for (const iosCluster of ios) {
      const score = candidateScore(androidCluster, iosCluster);
      if (score)
        candidates.push({ android: androidCluster, ios: iosCluster, score });
    }
  }
  candidates.sort(
    (left, right) => right.score.confidence - left.score.confidence,
  );
  const matchedAndroid = new Set();
  const matchedIos = new Set();
  const comparisons = [];
  for (const candidate of candidates) {
    if (
      matchedAndroid.has(candidate.android.clusterId) ||
      matchedIos.has(candidate.ios.clusterId)
    )
      continue;
    if (candidate.score.confidence < minimumSharedClusterConfidence) continue;
    matchedAndroid.add(candidate.android.clusterId);
    matchedIos.add(candidate.ios.clusterId);
    const dominantAndroid =
      candidate.android.mentionCount >= candidate.ios.mentionCount * 2;
    const dominantIos =
      candidate.ios.mentionCount >= candidate.android.mentionCount * 2;
    let classification = "shared";
    if (dominantAndroid) classification = "platformDominantAndroid";
    else if (dominantIos) classification = "platformDominantIos";
    if (classification === "shared") {
      comparisons.push(
        validateCrossPlatformComparison({
          recordType: "crossPlatformComparison",
          product,
          comparisonId: createComparisonId({
            productId: product.productId,
            classification,
            canonicalIssue: candidate.android.canonicalIssue,
          }),
          classification,
          canonicalIssue: candidate.android.canonicalIssue,
          feedbackType: candidate.android.feedbackType,
          topics: [
            ...new Set([...candidate.android.topics, ...candidate.ios.topics]),
          ].sort(),
          severity:
            candidate.android.severity === "unknown"
              ? candidate.ios.severity
              : candidate.android.severity,
          androidClusterId: candidate.android.clusterId,
          iosClusterId: candidate.ios.clusterId,
          androidMentions: candidate.android.mentionCount,
          iosMentions: candidate.ios.mentionCount,
          sharedConfidence: candidate.score.confidence,
          reasons: candidate.score.reasons,
          warnings: [],
        }),
      );
    } else {
      const dominant =
        classification === "platformDominantAndroid"
          ? candidate.android
          : candidate.ios;
      comparisons.push(
        specificComparison({
          product,
          cluster: dominant,
          classification,
          comparisonConfidence: candidate.score.confidence,
          minimumPlatformSpecificMentions,
          platformEvidence,
          warning: {
            code: "PLATFORM_DOMINANCE_OBSERVED",
            platform: platformFor(dominant.platform.id),
            message:
              "Mention volume is at least twice the matched counterpart in the collected sample.",
          },
        }),
      );
    }
  }
  for (const cluster of android.filter(
    (entry) => !matchedAndroid.has(entry.clusterId),
  )) {
    comparisons.push(
      specificComparison({
        product,
        cluster,
        classification: "androidOnly",
        comparisonConfidence: 0.5,
        minimumPlatformSpecificMentions,
        platformEvidence,
      }),
    );
  }
  for (const cluster of ios.filter(
    (entry) => !matchedIos.has(entry.clusterId),
  )) {
    comparisons.push(
      specificComparison({
        product,
        cluster,
        classification: "iosOnly",
        comparisonConfidence: 0.5,
        minimumPlatformSpecificMentions,
        platformEvidence,
      }),
    );
  }
  return { comparisons };
};
