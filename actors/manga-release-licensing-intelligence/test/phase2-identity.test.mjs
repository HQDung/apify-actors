import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateMatchConfidence } from '../src/identity/calculate-match-confidence.js';
import { normalizeTitle } from '../src/identity/normalize-title.js';
import { createKitsuAdapter } from '../src/sources/metadata/kitsu-adapter.js';
import { createOpenLibraryAdapter } from '../src/sources/metadata/open-library-adapter.js';
import { resolveWork } from '../src/sources/metadata/resolve-work.js';

test('title normalization handles Vietnamese diacritics and multiplication symbols', () => {
    assert.equal(normalizeTitle('Đảo Hải Tặc'), 'dao hai tac');
    assert.equal(normalizeTitle('Spy × Family'), 'spy x family');
    assert.equal(normalizeTitle('  ONE—PIECE  '), 'one piece');
});

test('native-title matches receive a high-confidence matched status', () => {
    const result = calculateMatchConfidence('ONE PIECE', {
        canonicalTitle: 'One Piece',
        nativeTitle: 'ONE PIECE',
        aliases: [],
    });
    assert.equal(result.status, 'matched');
    assert.ok(result.confidence >= 0.95);
    assert.deepEqual(result.matchedBy, ['nativeTitle']);
});

test('Kitsu adapter selects the best matching manga candidate instead of the first result', async () => {
    const adapter = createKitsuAdapter({
        fetchImpl: async () => new Response(JSON.stringify({
            data: [
                { id: 'wrong', type: 'manga', attributes: { canonicalTitle: 'Case Closed: Kindaichi', titles: { en: 'Case Closed: Kindaichi' }, status: 'finished' } },
                { id: '185143', type: 'manga', attributes: { canonicalTitle: 'Detective Conan', titles: { en: 'Detective Conan', vi: 'Thám Tử Lừng Danh Conan' }, status: 'current' } },
            ],
        }), { status: 200 }),
    });

    const result = await adapter.search('Thám Tử Lừng Danh Conan');
    assert.equal(result.work.workId, 'kitsu:185143');
    assert.equal(result.match.status, 'matched');
    assert.ok(result.match.confidence >= 0.95);
});

test('vetted Vietnamese aliases can match a canonical Kitsu record when the API omits the alias field', async () => {
    const adapter = createKitsuAdapter({
        fetchImpl: async () => new Response(JSON.stringify({
            data: [{ id: '38', type: 'manga', attributes: { canonicalTitle: 'One Piece', titles: { en: 'One Piece' }, status: 'current' } }],
        }), { status: 200 }),
    });
    const result = await adapter.search('Đảo Hải Tặc');
    assert.equal(result.work.canonicalTitle, 'One Piece');
    assert.equal(result.match.status, 'matched');
    assert.equal(result.match.matchedBy[0], 'alias');
});

test('Open Library rejects an anime-only result instead of calling it a manga work', async () => {
    const adapter = createOpenLibraryAdapter({
        fetchImpl: async () => new Response(JSON.stringify({
            docs: [{
                key: '/works/OLANIMEW',
                title: 'One Piece Anime Guide',
                subject: ['Anime television programs'],
                author_name: ['Guide Author'],
            }],
        }), { status: 200 }),
    });

    const result = await adapter.search('One Piece');
    assert.equal(result, null);
});

test('resolver keeps the strongest primary identity and merges fallback metadata', async () => {
    const result = await resolveWork('One Piece', {
        adapters: [
            {
                name: 'kitsu',
                search: async () => ({
                    work: {
                        workId: 'kitsu:38',
                        canonicalTitle: 'One Piece',
                        aliases: [],
                        authors: [],
                        metadataSourceIds: { kitsu: '38' },
                    },
                    editions: [],
                    match: { status: 'matched', confidence: 0.98, matchedBy: ['canonicalTitle'] },
                    source: { sourceName: 'kitsu', sourceType: 'metadata' },
                }),
            },
            {
                name: 'openlibrary',
                search: async () => ({
                    work: {
                        workId: 'openlibrary:OL27448W',
                        canonicalTitle: 'One Piece',
                        aliases: [],
                        authors: [{ name: 'Eiichiro Oda', role: null }],
                        originalPublisher: 'Shueisha',
                        metadataSourceIds: { openlibrary: 'OL27448W' },
                    },
                    editions: [{ editionId: 'edition:1', isbn13: '9781569319017' }],
                    match: { status: 'matched', confidence: 0.98, matchedBy: ['canonicalTitle'] },
                    source: { sourceName: 'openlibrary', sourceType: 'metadata' },
                }),
            },
        ],
        retryDelayMs: 0,
    });

    assert.equal(result.work.workId, 'kitsu:38');
    assert.equal(result.work.authors[0].name, 'Eiichiro Oda');
    assert.equal(result.work.originalPublisher, 'Shueisha');
    assert.equal(result.editions[0].isbn13, '9781569319017');
    assert.deepEqual(result.sources.map((source) => source.sourceName), ['kitsu', 'openlibrary']);
});
