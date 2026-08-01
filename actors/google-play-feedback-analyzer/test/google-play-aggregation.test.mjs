import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildGooglePlayAggregation, reportKeyForProduct } from '../src/aggregation/google-play-aggregation.js';

const coreRecord = ({ id, appId, createdAt, topic = 'crashes' }) => ({
    source: { platform: 'google-play', sourceRecordId: id, sourceUrl: null, collectedAt: '2026-08-01T00:00:00.000Z' },
    product: { productType: 'app', productId: appId, name: null, version: null },
    feedback: {
        text: 'The app crashes on launch.',
        title: null,
        sourceLanguage: 'en',
        createdAt,
        updatedAt: null,
        isPositive: false,
        rating: 1,
    },
    environmentContext: { countryCode: 'US', appVersion: null, device: null, operatingSystem: null },
    analysis: {
        analysisStatus: 'success',
        isActionableFeedback: true,
        actionabilityScore: 0.8,
        primaryFeedbackType: 'bugReport',
        feedbackTypes: ['bugReport'],
        sentiment: 'negative',
        severity: 'high',
        topics: [topic],
        summary: 'The app crashes on launch.',
        issue: { title: 'Reported crash on launch' },
        featureRequest: null,
        positiveSignals: [],
        sourceLanguage: 'en',
        analysisLanguage: 'english',
        originalTextPreserved: true,
        modelMetadata: { provider: 'test', model: 'test', schemaVersion: '1.0' },
    },
});

test('clusters and aggregates each Google Play app independently', () => {
    const records = buildGooglePlayAggregation({
        coreRecords: [
            coreRecord({ id: 'one-1', appId: 'com.one', createdAt: '2026-07-01T00:00:00.000Z' }),
            coreRecord({ id: 'one-2', appId: 'com.one', createdAt: '2026-07-02T00:00:00.000Z' }),
            coreRecord({ id: 'two-1', appId: 'com.two', createdAt: '2026-07-03T00:00:00.000Z' }),
        ],
        aggregation: { enabled: true, minimumClusterSize: 2, comparison: { enabled: false } },
    });

    assert.equal(records.filter((record) => record.recordType === 'feedbackCluster').length, 1);
    assert.deepEqual(records.find((record) => record.recordType === 'feedbackCluster').productId, 'com.one');
    assert.equal(records.filter((record) => record.recordType === 'productFeedbackReport').length, 2);
    assert.deepEqual(
        records
            .map((record) => record.product?.productId ?? record.productId)
            .filter(Boolean)
            .sort(),
        ['com.one', 'com.one', 'com.two'],
    );
});

test('emits an observational comparison report around a release timestamp', () => {
    const records = buildGooglePlayAggregation({
        coreRecords: [
            coreRecord({ id: 'before', appId: 'com.one', createdAt: '2026-07-01T00:00:00.000Z' }),
            coreRecord({
                id: 'after',
                appId: 'com.one',
                createdAt: '2026-07-10T00:00:00.000Z',
                topic: 'notifications',
            }),
        ],
        aggregation: {
            enabled: true,
            minimumClusterSize: 2,
            comparison: { enabled: true, releasedAt: '2026-07-05T00:00:00.000Z', daysBefore: 14, daysAfter: 14 },
        },
    });

    const impact = records.find((record) => record.recordType === 'feedbackImpactReport');
    assert.equal(impact.statistics.beforeReviews, 1);
    assert.equal(impact.statistics.afterReviews, 1);
    assert.match(impact.disclaimer, /not a causal confirmation/);
});

test('uses stable safe keys for per-app reports', () => {
    assert.equal(reportKeyForProduct('com.example.app'), 'APP_REPORT_com_example_app');
});
