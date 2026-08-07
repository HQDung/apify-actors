import { describe, expect, it } from 'vitest';

import { buildPeriodCoverage } from '../src/domain/coverage.js';

const bounds = {
    requestedStart: '2026-07-24T00:00:00.000Z',
    requestedEnd: '2026-07-31T00:00:00.000Z',
};

describe('period coverage', () => {
    it('marks a reached window with enough samples as full', () => {
        expect(
            buildPeriodCoverage({
                ...bounds,
                observedTimestamps: ['2026-07-30T00:00:00.000Z', '2026-07-24T00:00:00.000Z'],
                scannedReviews: 80,
                analyzedReviews: 8,
                reachedRequestedStart: true,
                truncatedByPageLimit: false,
            }),
        ).toMatchObject({ coverageStatus: 'full', reachedRequestedStart: true, analyzedReviews: 8 });
    });

    it('marks a sampleable but unreached window as partial', () => {
        expect(
            buildPeriodCoverage({
                ...bounds,
                observedTimestamps: ['2026-07-30T00:00:00.000Z'],
                scannedReviews: 40,
                analyzedReviews: 8,
                reachedRequestedStart: false,
                truncatedByPageLimit: true,
            }),
        ).toMatchObject({ coverageStatus: 'partial', truncatedByPageLimit: true });
    });

    it('marks a period below the meaningful threshold as insufficient', () => {
        expect(
            buildPeriodCoverage({
                ...bounds,
                observedTimestamps: [],
                scannedReviews: 2,
                analyzedReviews: 2,
                reachedRequestedStart: true,
                truncatedByPageLimit: false,
            }),
        ).toMatchObject({ coverageStatus: 'insufficient', observedOldestReviewAt: null, observedNewestReviewAt: null });
    });
});
