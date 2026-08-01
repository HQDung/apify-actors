import {
  aggregateFeedback,
  clusterFeedback,
  compareFeedbackWindows,
} from "@project/feedback-analysis-core";

const dayMs = 24 * 60 * 60 * 1000;

const buildWindows = ({ releasedAt, daysBefore = 14, daysAfter = 14 }) => {
  const releaseTime = new Date(releasedAt).getTime();
  if (!Number.isFinite(releaseTime))
    throw new Error(
      "APP_STORE_INVALID_COMPARISON: releasedAt must be an ISO date-time",
    );
  return {
    before: {
      from: new Date(releaseTime - daysBefore * dayMs).toISOString(),
      to: new Date(releaseTime - 1).toISOString(),
      recentDays: null,
    },
    after: {
      from: new Date(releaseTime).toISOString(),
      to: new Date(releaseTime + daysAfter * dayMs - 1).toISOString(),
      recentDays: null,
    },
  };
};

const inWindow = (record, window) =>
  Boolean(
    record.feedback?.createdAt &&
    record.feedback.createdAt >= window.from &&
    record.feedback.createdAt <= window.to,
  );

export const buildAppStoreAggregation = ({
  coreRecords,
  aggregation = {},
  releaseImpact = null,
  generatedAt = new Date().toISOString(),
}) => {
  if (aggregation.enabled === false) return [];
  const groups = new Map();
  for (const record of coreRecords) {
    const productId = String(record.product?.productId ?? "");
    if (!productId) continue;
    groups.set(productId, [...(groups.get(productId) ?? []), record]);
  }
  const output = [];
  for (const records of groups.values()) {
    const [{ product }] = records;
    const { clusters } = clusterFeedback({
      records,
      minimumClusterSize: aggregation.minimumClusterSize ?? 2,
    });
    output.push(
      ...clusters,
      aggregateFeedback({ product, records, clusters, generatedAt }),
    );
    if (releaseImpact?.releasedAt) {
      const windows = buildWindows(releaseImpact);
      output.push({
        ...compareFeedbackWindows({
          product,
          beforeRecords: records.filter((record) =>
            inWindow(record, windows.before),
          ),
          afterRecords: records.filter((record) =>
            inWindow(record, windows.after),
          ),
          windows,
          generatedAt,
        }),
        release: releaseImpact,
      });
    }
  }
  return output;
};

export const reportKeyForProduct = (productId) =>
  `APP_STORE_REPORT_${String(productId).replace(/[^A-Za-z0-9_-]/g, "_")}`;

export { buildWindows };
