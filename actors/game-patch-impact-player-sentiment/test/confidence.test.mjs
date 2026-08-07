import { describe, expect, it } from 'vitest';

import { calculateConfidence } from '../src/domain/confidence.js';

const coverage = (coverageStatus, analyzedReviews = 40) => ({ coverageStatus, analyzedReviews });

describe('confidence', () => {
    it('returns a high label for complete, well-sampled evidence', () => {
        const result = calculateConfidence({
            beforeCoverage: coverage('full'),
            afterCoverage: coverage('full'),
            beforeReviewCount: 40,
            afterReviewCount: 40,
            sentimentDelta: -0.12,
            patch: { accepted: true, confidence: 0.9 },
            comparisonMode: 'latest_patch',
        });
        expect(result).toMatchObject({ confidenceLabel: 'high' });
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('caps partial and insufficient coverage as required', () => {
        const partial = calculateConfidence({
            beforeCoverage: coverage('partial'),
            afterCoverage: coverage('full'),
            beforeReviewCount: 40,
            afterReviewCount: 40,
            sentimentDelta: -0.2,
            comparisonMode: 'recent_vs_previous',
        });
        const insufficient = calculateConfidence({
            beforeCoverage: coverage('insufficient', 4),
            afterCoverage: coverage('full'),
            beforeReviewCount: 4,
            afterReviewCount: 40,
            sentimentDelta: -0.2,
            comparisonMode: 'recent_vs_previous',
        });
        expect(partial.confidence).toBeLessThanOrEqual(0.69);
        expect(insufficient.confidence).toBeLessThanOrEqual(0.39);
        expect(insufficient.confidenceLabel).toBe('low');
    });
});
