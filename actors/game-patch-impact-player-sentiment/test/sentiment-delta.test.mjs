import { describe, expect, it } from 'vitest';

import { compareSentiment } from '../src/domain/sentiment-delta.js';

const period = (positiveRate, reviewCount = 20) => ({
    reviewCount,
    positive: Math.round(positiveRate * reviewCount),
    negative: reviewCount - Math.round(positiveRate * reviewCount),
    positiveRate,
});

describe('sentiment delta', () => {
    it.each([
        [-0.14, 'strongly_negative'],
        [-0.04, 'negative'],
        [0, 'stable'],
        [0.04, 'positive'],
        [0.14, 'strongly_positive'],
    ])('classifies a delta of %s as %s', (delta, direction) => {
        const result = compareSentiment({ before: period(0.5), after: period(0.5 + delta) });
        expect(result).toMatchObject({ sentimentDelta: delta, direction, sentimentDeltaPercentagePoints: delta * 100 });
    });

    it('refuses to assign a direction when either period is below the meaningful sample threshold', () => {
        expect(compareSentiment({ before: period(1, 7), after: period(0, 20) })).toMatchObject({
            direction: 'insufficient_data',
            sentimentDelta: -1,
        });
    });
});
