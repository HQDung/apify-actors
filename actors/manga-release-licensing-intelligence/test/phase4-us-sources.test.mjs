import test from 'node:test';
import assert from 'node:assert/strict';

import { collectVizSignals, isAllowedVizUrl } from '../src/sources/us/viz-adapter.js';
import { DEFAULT_INPUT } from '../src/config/defaults.js';
import { runTitleLookup } from '../src/runtime/run-title-lookup.js';

const seriesHtml = `
    <html><body>
      <a href="/manga-books/manga/one-piece-volume-1-0/product/139">One Piece, Vol. 1</a>
      <a href="https://www.viz.com/shonenjump">Read with Shonen Jump</a>
    </body></html>`;

const productHtml = `
    <html><head><script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Product","name":"One Piece, Vol. 1","sku":"139","isbn":"9781569319017","offers":{"price":"11.99","priceCurrency":"USD","availability":"https://schema.org/InStock"}}
    </script></head><body><h2>One Piece, Vol. 1</h2><div class="o_release-date"><strong>Release</strong> September 2, 2003</div><div class="o_isbn13"><strong>ISBN-13</strong> 978-1-56931-901-7</div><div><strong>Imprint</strong> <a>SHONEN JUMP</a></div></body></html>`;

test('VIZ allowlist accepts catalog and product routes but rejects disallowed content paths', () => {
    assert.equal(isAllowedVizUrl('https://www.viz.com/manga-books/manga/one-piece/all'), true);
    assert.equal(isAllowedVizUrl('https://www.viz.com/manga-books/manga/one-piece-volume-1-0/product/139'), true);
    assert.equal(isAllowedVizUrl('https://www.viz.com/products/preview/139'), false);
    assert.equal(isAllowedVizUrl('https://www.viz.com/manga-books/manga/one-piece/chapter-1/image.jpg'), false);
});

test('VIZ adapter extracts an official license signal, reading link, and edition metadata', async () => {
    const requested = [];
    const result = await collectVizSignals({
        work: { canonicalTitle: 'One Piece', workId: 'kitsu:38' },
        market: { countryCode: 'US', languageCode: 'en' },
        fetchImpl: async (url) => {
            requested.push(String(url));
            return new Response(String(url).includes('/product/') ? productHtml : seriesHtml, {
                status: 200,
                headers: { 'content-type': 'text/html' },
            });
        },
        maxEditions: 3,
    });

    assert.equal(result.license.status, 'licenseSignalFound');
    assert.equal(result.license.localPublisher, 'VIZ Media');
    assert.equal(result.officialAvailability.isAvailable, true);
    assert.equal(result.officialAvailability.links[0].url, 'https://www.viz.com/shonenjump');
    assert.equal(result.editions[0].isbn13, '9781569319017');
    assert.equal(result.editions[0].volumeNumber, 1);
    assert.equal(result.editions[0].releaseDate, '2003-09-02');
    assert.equal(result.editions[0].imprint, 'SHONEN JUMP');
    assert.equal(result.editions[0].format, 'paperback');
    assert.ok(requested.every((url) => isAllowedVizUrl(url)));
});

test('VIZ adapter returns a partial warning when the public catalog is unavailable', async () => {
    const result = await collectVizSignals({
        work: { canonicalTitle: 'Unknown Title', workId: 'kitsu:unknown' },
        market: { countryCode: 'US', languageCode: 'en' },
        fetchImpl: async () => new Response('not found', { status: 404 }),
    });

    assert.equal(result.license.status, 'unknown');
    assert.equal(result.officialAvailability.isAvailable, null);
    assert.ok(result.warnings.some((warning) => warning.code === 'PUBLISHER_SOURCE_FAILED'));
});

test('title lookup merges US enrichment into the market snapshot without losing metadata', async () => {
    const pushed = [];
    const result = await runTitleLookup({
        input: DEFAULT_INPUT,
        adapters: [{
            name: 'fixture',
            search: async () => ({
                work: { workId: 'kitsu:38', canonicalTitle: 'One Piece', aliases: [], authors: [] },
                editions: [],
                match: { status: 'matched', confidence: 0.98, matchedBy: ['canonicalTitle'] },
                source: { sourceName: 'fixture', sourceType: 'metadata' },
            }),
        }],
        enrichmentFor: async () => ({
            license: { status: 'licenseSignalFound', localPublisher: 'VIZ Media' },
            officialAvailability: { isAvailable: true, links: [{ url: 'https://www.viz.com/shonenjump' }] },
            editions: [{ editionId: 'edition:1', isbn13: '9781569319017' }],
            sources: [{ sourceName: 'viz', sourceType: 'publisher' }],
            warnings: [],
        }),
        pushData: async (record) => pushed.push(record),
    });

    assert.equal(result.snapshots.length, 1);
    assert.equal(pushed[0].license.localPublisher, 'VIZ Media');
    assert.equal(pushed[0].officialAvailability.isAvailable, true);
    assert.equal(pushed[0].work.canonicalTitle, 'One Piece');
});

test('US source failure preserves canonical metadata and never emits unlicensed', async () => {
    const pushed = [];
    await runTitleLookup({
        input: DEFAULT_INPUT,
        adapters: [{
            name: 'fixture',
            search: async () => ({
                work: { workId: 'kitsu:38', canonicalTitle: 'One Piece', aliases: [], authors: [] },
                editions: [],
                match: { status: 'matched', confidence: 0.98, matchedBy: ['canonicalTitle'] },
                source: { sourceName: 'fixture', sourceType: 'metadata' },
            }),
        }],
        enrichmentFor: async () => {
            const error = new Error('fixture publisher unavailable');
            error.code = 'PUBLISHER_SOURCE_FAILED';
            throw error;
        },
        pushData: async (record) => pushed.push(record),
    });

    assert.equal(pushed[0].work.canonicalTitle, 'One Piece');
    assert.equal(pushed[0].license.status, 'unknown');
    assert.notEqual(pushed[0].license.status, 'unlicensed');
    assert.ok(pushed[0].warnings.some((warning) => warning.code === 'PUBLISHER_SOURCE_FAILED'));
});
