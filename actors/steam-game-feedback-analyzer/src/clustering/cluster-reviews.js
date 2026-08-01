import { clusterFeedback } from "@project/feedback-analysis-core";

import { toCoreAnalysisRecord } from "../core/steam-contract-adapter.js";

export const clusterReviews = ({ records, minimumClusterSize = 2 }) => {
  const core = clusterFeedback({ records: records.map(toCoreAnalysisRecord), minimumClusterSize });
  return {
    reviewClusterIds: core.reviewClusterIds,
    clusters: core.clusters.map((cluster) => {
      const sourceRecord = records.find((record) => cluster.reviewIds.includes(String(record.review.reviewId)));
      return {
        recordType: "feedbackCluster",
        clusterId: cluster.clusterId,
        game: sourceRecord?.game ?? { steamAppId: Number(cluster.productId), name: cluster.product?.name ?? `Steam app ${cluster.productId}` },
        canonicalIssue: cluster.canonicalIssue,
        feedbackType: cluster.feedbackType,
        topics: cluster.topics,
        mentionCount: cluster.mentionCount,
        uniqueReviewCount: cluster.uniqueReviewCount,
        languages: cluster.languages,
        firstSeenAt: cluster.firstSeenAt,
        latestSeenAt: cluster.latestSeenAt,
        severity: cluster.severity,
        clusterConfidence: cluster.clusterConfidence,
        reviewIds: cluster.reviewIds,
        exampleReviewIds: cluster.exampleReviewIds,
      };
    }),
  };
};
