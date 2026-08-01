import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeInput } from '../src/google-play/normalize-input.js';
import {
    buildReleaseImpactWindows,
    compareGooglePlayReleaseImpact,
} from '../src/release-impact/google-play-release-impact.js';

const record = ({
    id,
    createdAt,
    rating,
    topic = 'crashes',
    country = 'US',
    language = 'en',
    version = null,
    issue = 'Reported crash',
}) => ({
    source: { sourceRecordId: id },
    product: { productType: 'app', productId: 'com.example.app', name: null, version },
    feedback: { text: id, sourceLanguage: language, createdAt, rating },
    environmentContext: { countryCode: country, appVersion: version },
    analysis: {
        analysisStatus: 'success',
        isActionableFeedback: true,
        primaryFeedbackType: issue ? 'bugReport' : 'featureRequest',
        topics: [topic],
        issue: issue ? { title: issue } : null,
        featureRequest: issue ? null : { title: 'Add dark mode' },
    },
});

test('normalizes release-impact mode and array source dimensions', () => {
    assert.deepEqual(
        normalizeInput({
            mode: 'releaseImpact',
            appIds: ['com.example.app'],
            languages: ['en', 'vi'],
            countries: ['us', 'vn'],
            release: { version: '4.2.0', releasedAt: '2026-07-20' },
            daysBefore: 7,
            daysAfter: 21,
            maxReviewsPerPeriod: 100,
        }),
        {
            appIds: ['com.example.app'],
            mode: 'releaseImpact',
            languages: ['en', 'vi'],
            countries: ['US', 'VN'],
            release: { version: '4.2.0', releasedAt: '2026-07-20T00:00:00.000Z' },
            daysBefore: 7,
            daysAfter: 21,
            maxReviewsPerPeriod: 100,
            language: 'en',
            country: 'US',
            maxReviewsPerApp: 50,
            sort: 'mostRelevant',
            useBrowserFallback: false,
            requestTimeoutSecs: 30,
            debug: false,
            analysis: { enabled: true, outputLanguage: 'english', maxAttempts: 2 },
            aggregation: {
                enabled: true,
                minimumClusterSize: 2,
                comparison: { enabled: false, releasedAt: null, daysBefore: 14, daysAfter: 14 },
            },
        },
    );
    assert.throws(() => normalizeInput({ mode: 'releaseImpact', appIds: ['com.example.app'] }), /release\.releasedAt/i);
});

test('builds non-overlapping release windows with the release boundary in after', () => {
    assert.deepEqual(
        buildReleaseImpactWindows({ releasedAt: '2026-07-20T00:00:00.000Z', daysBefore: 2, daysAfter: 3 }),
        {
            before: { from: '2026-07-18T00:00:00.000Z', to: '2026-07-19T23:59:59.999Z', recentDays: null },
            after: { from: '2026-07-20T00:00:00.000Z', to: '2026-07-22T23:59:59.999Z', recentDays: null },
        },
    );
});

test('reports rating, issue, feature, locale, version, and data sufficiency changes', () => {
    const report = compareGooglePlayReleaseImpact({
        product: { productType: 'app', productId: 'com.example.app', name: null },
        release: { version: '4.2.0', releasedAt: '2026-07-20T00:00:00.000Z' },
        windows: buildReleaseImpactWindows({ releasedAt: '2026-07-20T00:00:00.000Z', daysBefore: 14, daysAfter: 14 }),
        beforeRecords: [
            record({
                id: 'before',
                createdAt: '2026-07-19T10:00:00.000Z',
                rating: 4,
                topic: 'crashes',
                issue: 'Old issue',
            }),
        ],
        afterRecords: [
            record({
                id: 'after-1',
                createdAt: '2026-07-20T10:00:00.000Z',
                rating: 2,
                topic: 'crashes',
                version: '4.2.0',
            }),
            record({
                id: 'after-2',
                createdAt: '2026-07-21T10:00:00.000Z',
                rating: 1,
                topic: 'notifications',
                issue: null,
                country: 'VN',
                language: 'vi',
            }),
        ],
        generatedAt: '2026-07-31T00:00:00.000Z',
    });

    assert.deepEqual(report.statistics, {
        beforeReviews: 1,
        afterReviews: 2,
        beforeAnalyzed: 1,
        afterAnalyzed: 2,
        beforeAverageRating: 4,
        afterAverageRating: 1.5,
        ratingChange: -2.5,
    });
    assert.equal(report.newIssues[0].title, 'Reported crash');
    assert.equal(report.newFeatureRequests[0].title, 'Add dark mode');
    assert.equal(report.versionChanges[0].version, '4.2.0');
    assert.ok(report.warnings.some((warning) => warning.code === 'LIMITED_DATA'));
    assert.match(report.disclaimer, /not a causal confirmation/);
});
