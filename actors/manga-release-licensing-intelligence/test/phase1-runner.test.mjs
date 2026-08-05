import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_INPUT } from '../src/config/defaults.js';
import { runTitleLookup } from '../src/runtime/run-title-lookup.js';

const work = {
    workId: 'kitsu:38',
    canonicalTitle: 'One Piece',
    nativeTitle: null,
    aliases: [],
    authors: [],
    originalCountryCode: 'JP',
    originalLanguageCode: 'ja',
    publicationStatus: 'releasing',
    originalPublisher: null,
    latestOriginalVolume: null,
    metadataSourceIds: { kitsu: '38' },
};

test('title lookup pushes one snapshot after metadata resolution', async () => {
    const pushed = [];
    const result = await runTitleLookup({
        input: DEFAULT_INPUT,
        adapters: [{
            name: 'fixture',
            search: async () => ({
                work,
                editions: [],
                match: { status: 'matched', confidence: 0.98, matchedBy: ['canonicalTitle'] },
                source: { sourceName: 'fixture', sourceType: 'metadata' },
            }),
        }],
        pushData: async (snapshot) => pushed.push(snapshot),
        now: () => new Date('2026-08-05T00:00:00.000Z'),
    });

    assert.equal(result.snapshots.length, 1);
    assert.equal(pushed.length, 1);
    assert.equal(pushed[0].recordType, 'titleMarketSnapshot');
    assert.equal(result.stats.metadataSuccesses, 1);
});

test('title lookup fails when no metadata provider resolves the requested title', async () => {
    await assert.rejects(
        () => runTitleLookup({
            input: DEFAULT_INPUT,
            adapters: [{ name: 'fixture', search: async () => null }],
            pushData: async () => {},
        }),
        (error) => error.code === 'TITLE_NOT_FOUND',
    );
});
