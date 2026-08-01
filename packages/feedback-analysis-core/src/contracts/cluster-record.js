import { ERROR_CODES } from "../errors/error-codes.js";

const assert = (condition, message) => {
  if (!condition) throw new Error(`${ERROR_CODES.CLUSTERING_FAILED}: ${message}`);
};

export const validateClusterRecord = (cluster) => {
  assert(cluster && typeof cluster === "object" && !Array.isArray(cluster), "cluster must be an object.");
  assert(cluster.recordType === "feedbackCluster", "recordType must be feedbackCluster.");
  assert(typeof cluster.clusterId === "string" && cluster.clusterId.trim() !== "", "clusterId is required.");
  assert(typeof cluster.productId === "string" && cluster.productId.trim() !== "", "productId is required.");
  assert(typeof cluster.feedbackType === "string" && cluster.feedbackType.trim() !== "", "feedbackType is required.");
  assert(Number.isInteger(cluster.mentionCount) && cluster.mentionCount >= 1, "mentionCount must be a positive integer.");
  assert(Number.isInteger(cluster.uniqueReviewCount) && cluster.uniqueReviewCount >= 1, "uniqueReviewCount must be a positive integer.");
  assert(Array.isArray(cluster.reviewIds) && cluster.reviewIds.every((id) => typeof id === "string"), "reviewIds must be a string array.");
  return cluster;
};
