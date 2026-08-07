import { describe, expect, it } from 'vitest';

import { DEFAULT_INPUT } from '../src/config.js';
import { normalizeInput } from '../src/input/normalize-input.js';

describe('game patch impact input', () => {
    it('applies the safe Store defaults to an empty input object', () => {
        expect(normalizeInput({})).toEqual(DEFAULT_INPUT);
    });

    it('normalizes numeric App IDs and removes duplicate IDs', () => {
        expect(normalizeInput({ steamAppIds: [646570, '646570', '730'] }).steamAppIds).toEqual(['646570', '730']);
    });

    it('rejects invalid App ID lists', () => {
        expect(() => normalizeInput({ steamAppIds: [] })).toThrow(/at least one Steam App ID/i);
        expect(() => normalizeInput({ steamAppIds: ['646570', 'not-an-id'] })).toThrow(/numeric Steam App IDs/i);
        expect(() =>
            normalizeInput({ steamAppIds: Array.from({ length: 11 }, (_, index) => String(index + 1)) }),
        ).toThrow(/between 1 and 10/i);
    });

    it('rejects invalid bounded comparison settings', () => {
        expect(() => normalizeInput({ windowDays: 0 })).toThrow(/windowDays must be an integer between 1 and 30/i);
        expect(() => normalizeInput({ maxReviewsPerPeriod: 9 })).toThrow(
            /maxReviewsPerPeriod must be an integer between 10 and 250/i,
        );
        expect(() => normalizeInput({ language: 'klingon' })).toThrow(/language must be one of/i);
    });

    it('requires patchDate only for custom patch-date comparisons', () => {
        expect(() => normalizeInput({ comparisonMode: 'custom_patch_date' })).toThrow(/patchDate is required/i);
        expect(normalizeInput({ comparisonMode: 'custom_patch_date', patchDate: '2026-07-31' }).patchDate).toBe(
            '2026-07-31T00:00:00.000Z',
        );
    });
});
