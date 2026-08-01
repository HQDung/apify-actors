import { aggregateFeedback, clusterFeedback, compareFeedbackWindows } from '@project/feedback-analysis-core';

import { compareGooglePlayReleaseImpact } from '../release-impact/google-play-release-impact.js';

const dayMs = 24 * 60 * 60 * 1000;

const buildWindows = ({ releasedAt, daysBefore = 14, daysAfter = 14 }) => {
    const releaseTime = new Date(releasedAt).getTime();
    if (!Number.isFinite(releaseTime))
        throw new Error('GOOGLE_PLAY_INVALID_COMPARISON: releasedAt must be an ISO date-time');
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

const productGroups = (records) => {
    const groups = new Map();
    for (const record of records) {
        const productId = String(record.product?.productId ?? '');
        if (!productId) continue;
        const group = groups.get(productId) ?? [];
        group.push(record);
        groups.set(productId, group);
    }
    return groups;
};

const inWindow = (record, window) => {
    const createdAt = record.feedback?.createdAt;
    return Boolean(createdAt && window && createdAt >= window.from && createdAt <= window.to);
};

export const buildGooglePlayAggregation = ({
    coreRecords,
    aggregation = {},
    releaseImpact = null,
    generatedAt = new Date().toISOString(),
}) => {
    if (aggregation.enabled === false) return [];
    const output = [];
    const comparison = aggregation.comparison ?? {};

    for (const records of productGroups(coreRecords).values()) {
        const [{ product }] = records;
        const { clusters } = clusterFeedback({ records, minimumClusterSize: aggregation.minimumClusterSize ?? 2 });
        output.push(...clusters);
        output.push(aggregateFeedback({ product, records, clusters, generatedAt }));

        if (comparison.enabled && comparison.releasedAt) {
            const windows = buildWindows(comparison);
            const beforeRecords = records.filter((record) => inWindow(record, windows.before));
            const afterRecords = records.filter((record) => inWindow(record, windows.after));
            output.push(
                releaseImpact
                    ? compareGooglePlayReleaseImpact({
                          product,
                          release: releaseImpact,
                          beforeRecords,
                          afterRecords,
                          windows,
                          generatedAt,
                      })
                    : compareFeedbackWindows({ product, beforeRecords, afterRecords, windows, generatedAt }),
            );
        }
    }
    return output;
};

export const reportKeyForProduct = (productId) => `APP_REPORT_${String(productId).replace(/[^A-Za-z0-9_-]/g, '_')}`;

export const impactReportKeyForProduct = (productId) =>
    `APP_RELEASE_IMPACT_${String(productId).replace(/[^A-Za-z0-9_-]/g, '_')}`;

export { buildWindows };
