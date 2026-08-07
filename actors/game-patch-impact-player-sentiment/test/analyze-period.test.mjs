import { describe, expect, it } from 'vitest';

import { analyzePeriod } from '../src/services/analyze-period.js';

const feedback = ({ id, text, positive, language = 'english' }) => ({
    id,
    source: 'steam',
    appId: '646570',
    text,
    language,
    createdAt: '2026-07-31T00:00:00.000Z',
    updatedAt: null,
    positive,
    rating: positive ? 1 : 0,
    playtimeMinutes: 100,
    playtimeAtReviewMinutes: 80,
    helpfulVotes: 0,
    funnyVotes: 0,
    commentCount: 0,
    steamPurchase: true,
    receivedForFree: false,
    writtenDuringEarlyAccess: false,
    developerResponse: null,
});

describe('period analysis', () => {
    it('calculates recommendation rates, themes, requests, languages, and capped evidence', async () => {
        const result = await analyzePeriod({
            feedback: [
                feedback({ id: '1', text: 'The game is fun and the controls feel great.', positive: true }),
                feedback({ id: '2', text: 'The game crashes and stutters every match.', positive: false }),
                feedback({
                    id: '3',
                    text: 'Please add a practice mode for new players.',
                    positive: false,
                    language: 'german',
                }),
            ],
            includeEvidence: true,
        });
        expect(result).toMatchObject({
            reviewCount: 3,
            positive: 1,
            negative: 2,
            positiveRate: 1 / 3,
            languageDistribution: { english: 2, german: 1 },
        });
        expect(result.themes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ theme: 'crashes_stability', mentions: 1, negativeMentions: 1 }),
                expect.objectContaining({ theme: 'performance', mentions: 1, negativeMentions: 1 }),
            ]),
        );
        expect(result.featureRequests).toEqual([
            expect.objectContaining({ request: expect.stringContaining('practice mode'), count: 1 }),
        ]);
        expect(result.themes.every(({ evidence }) => evidence.length <= 2)).toBe(true);
        expect(result.analyses).toHaveLength(3);
    });

    it('omits evidence text when evidence is disabled', async () => {
        const result = await analyzePeriod({
            feedback: [feedback({ id: '1', text: 'The game crashes repeatedly.', positive: false })],
            includeEvidence: false,
        });
        expect(result.themes.find(({ theme }) => theme === 'crashes_stability')?.evidence).toEqual([]);
    });
});
