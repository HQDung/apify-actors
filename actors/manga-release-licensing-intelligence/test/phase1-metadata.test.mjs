import test from 'node:test';
import assert from 'node:assert/strict';

import { createKitsuAdapter } from '../src/sources/metadata/kitsu-adapter.js';
import { createOpenLibraryAdapter } from '../src/sources/metadata/open-library-adapter.js';
import { resolveWork } from '../src/sources/metadata/resolve-work.js';
import { withRetry } from '../src/runtime/retry.js';

const kitsuPayload = {
    data: {
        id: '38',
        type: 'manga',
        attributes: {
            canonicalTitle: 'One Piece',
            titles: { en: 'One Piece', ja_jp: 'ONE PIECE' },
            status: 'current',
            startDate: '1997-07-22',
            endDate: null,
            volumeCount: 114,
            chapterCount: 1170,
            serialization: 'Weekly Shonen Jump',
        },
    },
};

test('Kitsu adapter maps a JSON:API manga record to a work identity', async () => {
    const adapter = createKitsuAdapter({
        fetchImpl: async () => new Response(JSON.stringify(kitsuPayload), {
            status: 200,
            headers: { 'content-type': 'application/vnd.api+json' },
        }),
    });

    const result = await adapter.search('One Piece');
    assert.equal(result.work.workId, 'kitsu:38');
    assert.equal(result.work.canonicalTitle, 'One Piece');
    assert.equal(result.work.publicationStatus, 'releasing');
    assert.equal(result.work.metadataSourceIds.kitsu, '38');
    assert.equal(result.source.sourceName, 'kitsu');
});

test('Open Library adapter maps an edition-rich fallback response', async () => {
    const adapter = createOpenLibraryAdapter({
        fetchImpl: async () => new Response(JSON.stringify({
            docs: [{
                key: '/works/OL27448W',
                title: 'One Piece',
                author_name: ['Eiichiro Oda'],
                language: ['eng'],
                isbn: ['9781569319017'],
                first_publish_year: 2003,
            }],
        }), { status: 200 }),
    });

    const result = await adapter.search('One Piece');
    assert.equal(result.work.workId, 'openlibrary:OL27448W');
    assert.equal(result.work.canonicalTitle, 'One Piece');
    assert.equal(result.work.authors[0].name, 'Eiichiro Oda');
    assert.equal(result.editions[0].isbn13, '9781569319017');
});

test('metadata resolver falls back after a primary source failure', async () => {
    const fallback = {
        name: 'openlibrary',
        search: async () => ({
            work: { workId: 'openlibrary:OL27448W', canonicalTitle: 'One Piece' },
            editions: [],
            source: { sourceName: 'openlibrary', sourceType: 'metadata' },
        }),
    };
    const result = await resolveWork('One Piece', {
        adapters: [{ name: 'kitsu', search: async () => { throw new Error('temporary'); } }, fallback],
    });

    assert.equal(result.work.workId, 'openlibrary:OL27448W');
    assert.equal(result.match.status, 'matched');
    assert.deepEqual(result.sources.map((source) => source.sourceName), ['openlibrary']);
    assert.ok(result.warnings.some((warning) => warning.code === 'METADATA_SOURCE_FAILED'));
});

test('temporary source failures are retried twice before succeeding', async () => {
    let attempts = 0;
    const value = await withRetry(async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('temporary');
        return 'ok';
    }, { retries: 2, delayMs: 0 });

    assert.equal(value, 'ok');
    assert.equal(attempts, 3);
});
