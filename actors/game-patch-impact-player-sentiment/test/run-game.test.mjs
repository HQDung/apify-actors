import { describe, expect, it } from 'vitest';

import { runGame } from '../src/runtime/run-game.js';

describe('Phase 1 game runtime', () => {
    it('stores the bounded collection snapshot and pushes a coverage summary', async () => {
        const stored = [];
        const pushed = [];
        const collected = {
            status: 'ok',
            game: {
                steamAppId: '646570',
                gameName: 'Slay the Spire',
                storeUrl: 'https://store.steampowered.com/app/646570/',
            },
            windows: {
                boundaryAt: '2026-07-31T00:00:00.000Z',
                before: { startAt: '2026-07-24T00:00:00.000Z', endAt: '2026-07-31T00:00:00.000Z' },
                after: { startAt: '2026-07-31T00:00:00.000Z', endAt: '2026-08-07T00:00:00.000Z' },
            },
            periods: {
                before: { reviews: [{ id: 'b1' }], coverage: { coverageStatus: 'insufficient' } },
                after: { reviews: [{ id: 'a1' }], coverage: { coverageStatus: 'insufficient' } },
            },
            warnings: ['LOW_SAMPLE_BEFORE', 'LOW_SAMPLE_AFTER'],
            stats: { pagesFetched: 2, reviewsScanned: 4, reviewsAnalyzed: 2 },
        };
        const result = await runGame({
            appId: '646570',
            input: { windowDays: 7 },
            collect: async () => collected,
            pushData: async (value) => pushed.push(value),
            setValue: async (key, value) => stored.push([key, value]),
        });
        expect(result).toBe(collected);
        expect(stored).toEqual([['GAME_646570_COLLECTION', collected]]);
        expect(pushed[0]).toMatchObject({
            status: 'collection_only',
            steamAppId: '646570',
            coverage: collected.periods,
        });
    });

    it('passes an accepted latest patch boundary into collection', async () => {
        const collected = {
            status: 'ok',
            game: { steamAppId: '570', gameName: 'Dota 2', storeUrl: 'https://store.steampowered.com/app/570/' },
            windows: {
                boundaryAt: '2026-07-30T23:58:15.000Z',
                before: { startAt: '2026-07-23T23:58:15.000Z', endAt: '2026-07-30T23:58:15.000Z' },
                after: { startAt: '2026-07-30T23:58:15.000Z', endAt: '2026-08-06T23:58:15.000Z' },
            },
            periods: { before: { reviews: [], coverage: {} }, after: { reviews: [], coverage: {} } },
            warnings: [],
            stats: { pagesFetched: 1, reviewsScanned: 2, reviewsAnalyzed: 0 },
        };
        let received;
        const pushed = [];
        const result = await runGame({
            appId: '570',
            input: { comparisonMode: 'latest_patch', windowDays: 7 },
            newsAdapter: {
                fetchGameNews: async () => [
                    {
                        title: 'Gameplay Patch 7.41e',
                        content: 'Fixes bugs and balance changes.',
                        publishedAt: '2026-07-30T23:58:15.000Z',
                        source: 'steam_news',
                        isExternal: false,
                    },
                ],
            },
            collect: async (options) => {
                received = options;
                return collected;
            },
            pushData: async (value) => pushed.push(value),
            setValue: async () => {},
        });
        expect(received.patchBoundary).toBe('2026-07-30T23:58:15.000Z');
        expect(result.effectiveComparisonMode).toBe('latest_patch');
        expect(pushed[0]).toMatchObject({
            requestedComparisonMode: 'latest_patch',
            effectiveComparisonMode: 'latest_patch',
        });
    });

    it('keeps the run alive and exposes fallback warning when news is unavailable', async () => {
        const collected = {
            status: 'ok',
            game: {
                steamAppId: '646570',
                gameName: 'Slay the Spire',
                storeUrl: 'https://store.steampowered.com/app/646570/',
            },
            windows: {
                boundaryAt: '2026-07-31T00:00:00.000Z',
                before: { startAt: '', endAt: '' },
                after: { startAt: '', endAt: '' },
            },
            periods: { before: { reviews: [], coverage: {} }, after: { reviews: [], coverage: {} } },
            warnings: [],
            stats: { pagesFetched: 1, reviewsScanned: 1, reviewsAnalyzed: 0 },
        };
        const result = await runGame({
            appId: '646570',
            input: { comparisonMode: 'latest_patch', windowDays: 7 },
            newsAdapter: {
                fetchGameNews: async () => {
                    throw new Error('news unavailable');
                },
            },
            collect: async () => collected,
            pushData: async () => {},
            setValue: async () => {},
        });
        expect(result.warnings).toEqual(
            expect.arrayContaining(['NEWS_ENDPOINT_UNAVAILABLE', 'PATCH_DETECTION_FALLBACK']),
        );
        expect(result.effectiveComparisonMode).toBe('recent_vs_previous');
    });
});
