import { describe, expect, it } from 'vitest';

import { assignReviewPeriod, resolveComparisonWindow } from '../src/domain/comparison-window.js';

const now = '2026-08-07T00:00:00.000Z';

describe('comparison windows', () => {
    it('builds two adjacent seven-day rolling windows', () => {
        expect(resolveComparisonWindow({ mode: 'recent_vs_previous', windowDays: 7, now })).toEqual({
            boundaryAt: '2026-07-31T00:00:00.000Z',
            before: { startAt: '2026-07-24T00:00:00.000Z', endAt: '2026-07-31T00:00:00.000Z' },
            after: { startAt: '2026-07-31T00:00:00.000Z', endAt: '2026-08-07T00:00:00.000Z' },
        });
    });

    it('uses a custom patch date as the boundary', () => {
        expect(
            resolveComparisonWindow({
                mode: 'custom_patch_date',
                windowDays: 7,
                patchDate: '2026-07-31T00:00:00.000Z',
                now,
            }),
        ).toEqual({
            boundaryAt: '2026-07-31T00:00:00.000Z',
            before: { startAt: '2026-07-24T00:00:00.000Z', endAt: '2026-07-31T00:00:00.000Z' },
            after: { startAt: '2026-07-31T00:00:00.000Z', endAt: '2026-08-07T00:00:00.000Z' },
        });
    });

    it('assigns an exact boundary review to AFTER', () => {
        const windows = resolveComparisonWindow({ mode: 'recent_vs_previous', windowDays: 7, now });
        expect(assignReviewPeriod('2026-07-31T00:00:00.000Z', windows)).toBe('after');
        expect(assignReviewPeriod('2026-07-24T00:00:00.000Z', windows)).toBe('before');
        expect(assignReviewPeriod('2026-07-23T23:59:59.999Z', windows)).toBe(null);
    });
});
