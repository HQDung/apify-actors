import { describe, expect, it } from 'vitest';

import { analyzeGameFeedback, GAME_TAXONOMY, toNormalizedFeedback } from '../src/core/feedback-core-adapter.js';

const feedback = (overrides = {}) => ({
    id: 'review-1',
    source: 'steam',
    appId: '646570',
    text: 'The game crashes and stutters after the update.',
    language: 'english',
    createdAt: '2026-07-31T00:00:00.000Z',
    updatedAt: null,
    positive: false,
    rating: 0,
    playtimeMinutes: 120,
    playtimeAtReviewMinutes: 90,
    helpfulVotes: 2,
    funnyVotes: 0,
    commentCount: 0,
    steamPurchase: true,
    receivedForFree: false,
    writtenDuringEarlyAccess: false,
    developerResponse: null,
    ...overrides,
});

describe('feedback-analysis core adapter', () => {
    it('maps Steam feedback into and validates the shared normalized contract', () => {
        expect(toNormalizedFeedback(feedback())).toMatchObject({
            source: { platform: 'steam', sourceRecordId: 'review-1' },
            product: { productType: 'game', productId: '646570' },
            feedback: {
                text: 'The game crashes and stutters after the update.',
                sourceLanguage: 'english',
                isPositive: false,
                rating: 0,
            },
        });
        expect(GAME_TAXONOMY.topics).toEqual(
            expect.arrayContaining(['performance', 'crashes_stability', 'steam_deck']),
        );
    });

    it('uses Steam recommendation as the primary sentiment signal', async () => {
        const analysis = await analyzeGameFeedback(
            feedback({ positive: true, rating: 1, text: 'The game crashes constantly.' }),
        );
        expect(analysis).toMatchObject({ analysisStatus: 'success', sentiment: 'positive' });
        expect(analysis.topics).toEqual(expect.arrayContaining(['crashes_stability']));
    });

    it('extracts gaming themes and feature requests through the deterministic fallback', async () => {
        const analysis = await analyzeGameFeedback(
            feedback({
                text: 'Please add a practice mode and better controller support.',
                positive: false,
                rating: 0,
            }),
        );
        expect(analysis).toMatchObject({
            analysisStatus: 'success',
            sentiment: 'negative',
            primaryFeedbackType: 'featureRequest',
            featureRequest: expect.objectContaining({ title: expect.stringContaining('practice mode') }),
        });
        expect(analysis.topics).toEqual(expect.arrayContaining(['controls_input']));
    });

    it('does not force unmatched prose into a theme or feature request', async () => {
        const analysis = await analyzeGameFeedback(
            feedback({ text: 'This is a card based game where you fight battles over and over.', positive: true }),
        );
        expect(analysis.topics).toEqual([]);
        expect(analysis.featureRequest).toBeNull();
    });
});
