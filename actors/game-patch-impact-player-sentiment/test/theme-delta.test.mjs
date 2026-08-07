import { describe, expect, it } from 'vitest';

import {
    compareFeatureRequests,
    compareThemes,
    detectImprovements,
    detectNewIssues,
    detectRegressions,
} from '../src/domain/theme-delta.js';

const theme = (themeName, mentions, negativeMentions, evidence = []) => ({
    theme: themeName,
    mentions,
    negativeMentions,
    mentionRate: mentions / 20,
    negativeShare: mentions ? negativeMentions / mentions : 0,
    evidence,
});

describe('theme deltas', () => {
    const before = {
        reviewCount: 20,
        themes: [
            theme('performance', 1, 1, [{ text: 'Old performance complaint.' }]),
            theme('balance', 2, 1),
            theme('bugs', 8, 6),
        ],
        featureRequests: [{ request: 'practice mode', count: 1, evidence: [] }],
    };
    const after = {
        reviewCount: 20,
        themes: [
            theme('performance', 4, 3, [{ text: 'New performance complaint.' }]),
            theme('balance', 4, 3),
            theme('bugs', 3, 1),
        ],
        featureRequests: [{ request: 'practice mode', count: 2, evidence: [{ text: 'Please add a practice mode.' }] }],
    };

    it('calculates rates, negative shares, and evidence for the union of themes', () => {
        expect(compareThemes({ before, after })).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    theme: 'performance',
                    beforeMentionRate: 0.05,
                    afterMentionRate: 0.2,
                    mentionRateDelta: 0.15,
                    negativeShareAfter: 0.75,
                    evidence: ['New performance complaint.'],
                }),
            ]),
        );
    });

    it('applies safeguards for new issues, regressions, and improvements', () => {
        const deltas = compareThemes({ before, after });
        expect(detectNewIssues(deltas).map(({ theme: name }) => name)).toContain('performance');
        expect(detectRegressions(deltas).map(({ theme: name }) => name)).toContain('balance');
        expect(detectImprovements(deltas).map(({ theme: name }) => name)).toContain('bugs');
        expect(detectNewIssues(deltas).map(({ theme: name }) => name)).not.toContain('balance');
    });

    it('compares feature request counts and keeps after-period evidence', () => {
        expect(compareFeatureRequests({ before, after })).toEqual([
            expect.objectContaining({ request: 'practice mode', beforeCount: 1, afterCount: 2, count: 2 }),
        ]);
    });
});
