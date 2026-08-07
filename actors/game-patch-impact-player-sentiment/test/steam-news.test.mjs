import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { createSteamNewsAdapter } from '../src/adapters/steam-news.js';

const fixture = async (name) =>
    JSON.parse(await readFile(new URL(`../tests/fixtures/${name}`, import.meta.url), 'utf8'));
const responseFor = (body) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('Steam news adapter', () => {
    it('normalizes the bounded public news feed', async () => {
        const body = await fixture('steam-news-patch.json');
        const adapter = createSteamNewsAdapter({ fetchImpl: async () => responseFor(body), sleep: async () => {} });
        const items = await adapter.fetchGameNews('570');
        expect(items).toEqual([
            {
                id: 'patch-1',
                title: 'Gameplay Patch 7.41e and Summer Scrub',
                content: 'This patch fixes crashes, balance issues, and several gameplay bugs.',
                publishedAt: '2026-07-30T23:58:15.000Z',
                url: 'https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/patch-1',
                source: 'steam_news',
                isExternal: false,
            },
            expect.objectContaining({ id: 'event-1', source: 'steam_news' }),
        ]);
    });

    it('retries and surfaces news endpoint failure', async () => {
        let attempts = 0;
        const adapter = createSteamNewsAdapter({
            fetchImpl: async () => {
                attempts += 1;
                throw new Error('fetch failed');
            },
            sleep: async () => {},
        });
        await expect(adapter.fetchGameNews('646570')).rejects.toThrow(/fetch failed/i);
        expect(attempts).toBe(3);
    });
});
