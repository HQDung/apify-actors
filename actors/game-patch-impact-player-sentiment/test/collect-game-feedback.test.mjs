import { describe, expect, it } from 'vitest';

import { DEFAULT_INPUT } from '../src/config.js';
import { collectGameFeedback } from '../src/services/collect-game-feedback.js';

const review = (id, createdAt, positive = true) => ({
    id,
    source: 'steam',
    appId: '646570',
    text: `${id} review text`,
    language: 'english',
    createdAt,
    updatedAt: createdAt,
    positive,
    rating: positive ? 1 : 0,
    playtimeMinutes: 60,
    playtimeAtReviewMinutes: 30,
    helpfulVotes: 0,
    funnyVotes: 0,
    commentCount: 0,
    steamPurchase: true,
    receivedForFree: false,
    writtenDuringEarlyAccess: false,
    developerResponse: null,
});

const input = { ...DEFAULT_INPUT, steamAppIds: ['646570'] };

describe('game feedback collection service', () => {
    it('returns independent bounded periods and coverage metadata', async () => {
        const result = await collectGameFeedback({
            appId: '646570',
            input,
            now: '2026-08-07T00:00:00.000Z',
            metadataAdapter: {
                fetchGameMetadata: async () => ({
                    steamAppId: '646570',
                    gameName: 'Slay the Spire',
                    storeUrl: 'https://store.steampowered.com/app/646570/',
                }),
            },
            reviewsAdapter: {
                iterateRecentReviews: async () => ({
                    reviews: [
                        review('after-1', '2026-08-06T00:00:00.000Z'),
                        review('after-2', '2026-08-05T00:00:00.000Z'),
                        review('before-1', '2026-07-30T00:00:00.000Z', false),
                        review('before-2', '2026-07-25T00:00:00.000Z', false),
                    ],
                    pagesFetched: 2,
                    scannedReviews: 5,
                    reachedRequestedStart: true,
                    truncatedByPageLimit: false,
                    cursorLoopDetected: false,
                }),
            },
        });
        expect(result).toMatchObject({
            status: 'ok',
            game: { gameName: 'Slay the Spire' },
            stats: { pagesFetched: 2, reviewsScanned: 5 },
        });
        expect(result.periods.before.reviews.map(({ id }) => id)).toEqual(['before-1', 'before-2']);
        expect(result.periods.after.reviews.map(({ id }) => id)).toEqual(['after-1', 'after-2']);
        expect(result.periods.before.coverage).toMatchObject({ analyzedReviews: 2, coverageStatus: 'insufficient' });
        expect(result.periods.after.coverage).toMatchObject({ analyzedReviews: 2, coverageStatus: 'insufficient' });
    });

    it('returns a failed per-game result when Steam reviews are unavailable', async () => {
        const result = await collectGameFeedback({
            appId: '730',
            input: { ...input, steamAppIds: ['730'] },
            metadataAdapter: {
                fetchGameMetadata: async () => ({
                    steamAppId: '730',
                    gameName: 'Counter-Strike 2',
                    storeUrl: 'https://store.steampowered.com/app/730/',
                }),
            },
            reviewsAdapter: {
                iterateRecentReviews: async () => {
                    throw new Error('network down');
                },
            },
        });
        expect(result).toMatchObject({
            status: 'failed',
            errorCode: 'STEAM_REVIEWS_UNAVAILABLE',
            game: { steamAppId: '730' },
        });
        expect(result.warnings).toContain('STEAM_REVIEWS_UNAVAILABLE');
    });
});
