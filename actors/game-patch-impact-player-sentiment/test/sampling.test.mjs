import { describe, expect, it } from 'vitest';

import { sampleDeterministically } from '../src/domain/sampling.js';

const reviews = Array.from({ length: 20 }, (_, index) => ({ id: `review-${index + 1}`, text: `Review ${index + 1}` }));

describe('deterministic period sampling', () => {
    it('returns the same bounded sample for the same seed', () => {
        const first = sampleDeterministically(reviews, 5, '646570|before|seed');
        const second = sampleDeterministically(reviews, 5, '646570|before|seed');
        expect(first).toEqual(second);
        expect(first).toHaveLength(5);
    });

    it('does not mutate the eligible reviews and keeps all reviews when below the cap', () => {
        const original = [...reviews];
        expect(sampleDeterministically(reviews, 30, 'seed')).toEqual(reviews);
        expect(reviews).toEqual(original);
    });
});
