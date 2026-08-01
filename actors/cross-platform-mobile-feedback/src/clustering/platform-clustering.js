import {
  clusterFeedback,
  createClusterId,
  validateClusterRecord,
} from "@project/feedback-analysis-core";

const platformFor = (sourcePlatform) =>
  sourcePlatform === "apple-app-store" ? "appleAppStore" : "googlePlay";

const coreRecordFor = (entry) => ({
  ...entry.normalizedFeedback,
  analysis: entry.analysis,
});

export const clusterPlatformFeedback = ({
  analysisRecords,
  minimumClusterSize = 2,
}) => {
  const byPlatform = new Map();
  for (const entry of analysisRecords) {
    if (
      !entry.normalizedFeedback ||
      entry.analysis?.analysisStatus !== "success"
    )
      continue;
    const platform = platformFor(entry.normalizedFeedback.source.platform);
    const records = byPlatform.get(platform) ?? [];
    records.push({ entry, record: coreRecordFor(entry) });
    byPlatform.set(platform, records);
  }

  const clusters = [];
  const reviewClusterIds = {};
  for (const [platform, entries] of byPlatform) {
    const result = clusterFeedback({
      records: entries.map(({ record }) => record),
      minimumClusterSize,
    });
    for (const cluster of result.clusters) {
      const platformCluster = {
        ...cluster,
        clusterId: createClusterId({
          productId: cluster.productId,
          feedbackType: cluster.feedbackType,
          title: `${platform}:${cluster.canonicalIssue}`,
        }),
        platform: { id: platform },
        sourcePlatform: cluster.platform ?? platform,
      };
      validateClusterRecord(platformCluster);
      clusters.push(platformCluster);
    }
    for (const reviewId of Object.keys(result.reviewClusterIds)) {
      const cluster = result.clusters.find((entry) =>
        entry.reviewIds.includes(reviewId),
      );
      if (!cluster) continue;
      reviewClusterIds[`${platform}:${reviewId}`] = createClusterId({
        productId: cluster.productId,
        feedbackType: cluster.feedbackType,
        title: `${platform}:${cluster.canonicalIssue}`,
      });
    }
  }

  return { clusters, reviewClusterIds };
};
