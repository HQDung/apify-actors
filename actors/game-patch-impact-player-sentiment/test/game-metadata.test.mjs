import { describe, expect, it } from 'vitest';

import { createGameMetadataAdapter } from '../src/adapters/game-metadata.js';

const responseFor = (body) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('Steam game metadata adapter', () => {
    it('returns a best-effort game name and canonical store URL', async () => {
        const adapter = createGameMetadataAdapter({
            fetchImpl: async () =>
                responseFor({ 646570: { success: true, data: { steam_appid: 646570, name: 'Slay the Spire' } } }),
            sleep: async () => {},
        });
        await expect(adapter.fetchGameMetadata('646570')).resolves.toEqual({
            steamAppId: '646570',
            gameName: 'Slay the Spire',
            storeUrl: 'https://store.steampowered.com/app/646570/',
        });
    });

    it('returns a recoverable error when Steam cannot resolve the game', async () => {
        const adapter = createGameMetadataAdapter({
            fetchImpl: async () => responseFor({ 646570: { success: false } }),
            sleep: async () => {},
        });
        await expect(adapter.fetchGameMetadata('646570')).rejects.toThrow(/Steam app 646570 was not found/i);
    });
});
