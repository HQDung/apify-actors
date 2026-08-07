import { describe, expect, it } from 'vitest';

import { buildReport } from '../src/output/report-builder.js';

const coverage = (status) => ({
    requestedStart: '2026-07-24T00:00:00.000Z',
    requestedEnd: '2026-07-31T00:00:00.000Z',
    observedOldestReviewAt: '2026-07-24T01:00:00.000Z',
    observedNewestReviewAt: '2026-07-30T23:00:00.000Z',
    scannedReviews: 30,
    analyzedReviews: 20,
    reachedRequestedStart: true,
    truncatedByPageLimit: false,
    coverageStatus: status,
});

const period = (positive, negative, coverageStatus = 'full') => ({
    reviewCount: positive + negative,
    positive,
    negative,
    positiveRate: positive / (positive + negative),
    themes: [
        { theme: 'performance', mentions: 4, negativeMentions: 3, mentionRate: 0.2, negativeShare: 0.75, evidence: [] },
    ],
    featureRequests: [],
    languageDistribution: { english: positive + negative },
    coverage: coverage(coverageStatus),
});

describe('report builder', () => {
    it('builds the handoff-shaped report without causal language and propagates warnings', () => {
        const report = buildReport({
            collection: {
                status: 'ok',
                game: {
                    steamAppId: '646570',
                    gameName: 'Slay the Spire',
                    storeUrl: 'https://store.steampowered.com/app/646570/',
                },
                windows: {
                    boundaryAt: '2026-07-31T00:00:00.000Z',
                    before: { startAt: '2026-07-24T00:00:00.000Z', endAt: '2026-07-31T00:00:00.000Z' },
                    after: { startAt: '2026-07-31T00:00:00.000Z', endAt: '2026-08-07T00:00:00.000Z' },
                },
                warnings: ['PATCH_DETECTION_FALLBACK'],
                stats: { pagesFetched: 2, reviewsScanned: 60, reviewsAnalyzed: 40 },
            },
            input: { comparisonMode: 'latest_patch', windowDays: 7, includeEvidence: false },
            effectiveComparisonMode: 'recent_vs_previous',
            patch: null,
            before: period(16, 4),
            after: period(12, 8),
            comparison: { sentimentDelta: -0.2, direction: 'strongly_negative' },
            newIssues: [],
            regressions: [],
            improvements: [],
            featureRequests: [],
            confidence: { confidence: 0.55, confidenceLabel: 'low' },
            generatedAt: '2026-08-07T00:00:00.000Z',
        });
        expect(report).toMatchObject({
            status: 'ok',
            steamAppId: '646570',
            requestedComparisonMode: 'latest_patch',
            effectiveComparisonMode: 'recent_vs_previous',
            comparison: { before: { positive: 16 }, after: { positive: 12 }, sentimentDelta: -0.2 },
            impact: { direction: 'strongly_negative', confidence: 0.55, confidenceLabel: 'low' },
            warnings: ['PATCH_DETECTION_FALLBACK'],
            stats: { reviewsScanned: 60, reviewsAnalyzed: 40, reviewPagesFetched: 2 },
        });
        expect(report).not.toHaveProperty('reviews');
        expect(report.impact.summary).not.toMatch(/caused|because of|due to/i);
    });
});
