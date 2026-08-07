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
});
