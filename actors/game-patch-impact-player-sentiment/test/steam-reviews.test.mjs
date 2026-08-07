import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { buildReviewsUrl, createSteamReviewsAdapter, normalizeSteamReview } from '../src/adapters/steam-reviews.js';

const fixture = async (name) =>
    JSON.parse(await readFile(new URL(`../tests/fixtures/${name}`, import.meta.url), 'utf8'));
const responseFor = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const windows = {
    before: { startAt: '2026-07-24T00:00:00.000Z', endAt: '2026-07-31T00:00:00.000Z' },
    after: { startAt: '2026-07-31T00:00:00.000Z', endAt: '2026-08-07T00:00:00.000Z' },
};

describe('Steam review adapter', () => {
    it('URL-encodes cursors and maps off-topic filtering', () => {
        const url = buildReviewsUrl({
            appId: '646570',
            language: 'english',
            includeOffTopicReviews: true,
            cursor: 'next/cursor=',
        });
        expect(url).toContain('filter=recent');
        expect(url).toContain('num_per_page=100');
        expect(url).toContain('filter_offtopic_activity=0');
        expect(url).toContain('cursor=next%2Fcursor%3D');
    });

    it('paginates until the before boundary and returns bounded normalized records', async () => {
        const calls = [];
        const page1 = await fixture('steam-reviews-page-1.json');
        const page2 = await fixture('steam-reviews-page-2.json');
        const adapter = createSteamReviewsAdapter({
            fetchImpl: async (url) => {
                calls.push(String(url));
                return responseFor(calls.length === 1 ? page1 : page2);
            },
            sleep: async () => {},
        });
        const result = await adapter.iterateRecentReviews({
            appId: '646570',
            language: 'english',
            windows,
            now: '2026-08-07T00:00:00.000Z',
        });
        expect(calls).toHaveLength(2);
        expect(calls[1]).toContain('cursor=next%2Fcursor%3D');
        expect(result).toMatchObject({
            pagesFetched: 2,
            scannedReviews: 5,
            reachedRequestedStart: true,
            truncatedByPageLimit: false,
        });
        expect(result.reviews.map(({ id }) => id)).toEqual([
            'review-after',
            'review-boundary',
            'review-before-1',
            'review-before-2',
        ]);
    });

    it('normalizes Steam metadata into the source-neutral game feedback shape', () => {
        const normalized = normalizeSteamReview({
            appId: '646570',
            review: {
                recommendationid: 'review-1',
                language: 'english',
                review: 'The game crashes.',
                timestamp_created: 1785456000,
                timestamp_updated: 1785457000,
                voted_up: false,
                author: { playtime_forever: 120, playtime_at_review: 90 },
                votes_up: 3,
                votes_funny: 1,
                comment_count: 2,
                steam_purchase: true,
                received_for_free: false,
                written_during_early_access: false,
                developer_response: null,
            },
        });
        expect(normalized).toEqual({
            id: 'review-1',
            source: 'steam',
            appId: '646570',
            text: 'The game crashes.',
            language: 'english',
            createdAt: '2026-07-31T00:00:00.000Z',
            updatedAt: '2026-07-31T00:16:40.000Z',
            positive: false,
            rating: 0,
            playtimeMinutes: 120,
            playtimeAtReviewMinutes: 90,
            helpfulVotes: 3,
            funnyVotes: 1,
            commentCount: 2,
            steamPurchase: true,
            receivedForFree: false,
            writtenDuringEarlyAccess: false,
            developerResponse: null,
        });
    });

    it('retries transient responses and rejects malformed Steam responses', async () => {
        let attempts = 0;
        const retrying = createSteamReviewsAdapter({
            fetchImpl: async () => {
                attempts += 1;
                return attempts === 1
                    ? responseFor({ error: 'busy' }, 503)
                    : responseFor(await fixture('steam-reviews-empty.json'));
            },
            sleep: async () => {},
        });
        await expect(retrying.fetchReviewPage({ appId: '646570', cursor: '*' })).resolves.toMatchObject({
            reviews: [],
        });
        expect(attempts).toBe(2);

        const malformed = createSteamReviewsAdapter({
            fetchImpl: async () => responseFor({ success: 0, reviews: [] }),
            sleep: async () => {},
        });
        await expect(malformed.fetchReviewPage({ appId: '646570', cursor: '*' })).rejects.toThrow(/success=0/i);
    });

    it('stops on a repeated cursor and records the page-limit state', async () => {
        const page = await fixture('steam-reviews-page-1.json');
        const adapter = createSteamReviewsAdapter({
            fetchImpl: async () => responseFor({ ...page, cursor: 'same' }),
            sleep: async () => {},
        });
        const result = await adapter.iterateRecentReviews({
            appId: '646570',
            language: 'english',
            windows,
            maxPages: 5,
        });
        expect(result.pagesFetched).toBe(2);
        expect(result.cursorLoopDetected).toBe(true);
        expect(result.truncatedByPageLimit).toBe(false);
    });
});
