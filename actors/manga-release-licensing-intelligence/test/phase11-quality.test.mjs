import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_INPUT } from '../src/config/defaults.js';
import { calculateMatchConfidence } from '../src/identity/calculate-match-confidence.js';
import { matchEditions } from '../src/identity/match-edition.js';
import { normalizeStockStatus } from '../src/offers/normalize-stock.js';
import { calculateReleaseGap } from '../src/releases/calculate-release-gap.js';
import { runTitleLookup } from '../src/runtime/run-title-lookup.js';

const benchmarkCases = [
    ['One Piece', 'One Piece', []],
    ['Jujutsu Kaisen', 'Jujutsu Kaisen', []],
    ['My Hero Academia', 'My Hero Academia', []],
    ['Spy × Family', 'Spy x Family', []],
    ['Dandadan', 'Dandadan', []],
    ['Frieren: Beyond Journey\'s End', 'Frieren: Beyond Journey\'s End', []],
    ['Chainsaw Man', 'Chainsaw Man', []],
    ['Sakamoto Days', 'Sakamoto Days', []],
    ['Kaiju No. 8', 'Kaiju No. 8', []],
    ['One-Punch Man', 'One Punch-Man', []],
    ['Naruto', 'Naruto', []],
    ['Fullmetal Alchemist', 'Fullmetal Alchemist', []],
    ['Death Note', 'Death Note', []],
    ['Demon Slayer: Kimetsu no Yaiba', 'Demon Slayer: Kimetsu no Yaiba', []],
    ['Assassination Classroom', 'Assassination Classroom', []],
    ['Đảo Hải Tặc', 'One Piece', [{ title: 'Đảo Hải Tặc', languageCode: 'vi' }]],
    ['Đôrêmon', 'Doraemon', [{ title: 'Đôrêmon', languageCode: 'vi' }]],
    ['Thám Tử Lừng Danh Conan', 'Detective Conan', [{ title: 'Thám Tử Lừng Danh Conan', languageCode: 'vi' }]],
    ['Bảy Viên Ngọc Rồng', 'Dragon Ball', [{ title: 'Bảy Viên Ngọc Rồng', languageCode: 'vi' }]],
    ['Sailor Moon', 'Sailor Moon', []],
    ['Berserk', 'Berserk', []],
    ['Monster', 'Monster', []],
    ['Vagabond', 'Vagabond', []],
    ['Vinland Saga', 'Vinland Saga', []],
    ['Attack on Titan', 'Attack on Titan', []],
    ['JoJo’s Bizarre Adventure', "JoJo's Bizarre Adventure", []],
    ['The Apothecary Diaries', 'The Apothecary Diaries', []],
    ['Delicious in Dungeon', 'Delicious in Dungeon', []],
    ['Land of the Lustrous', 'Land of the Lustrous', []],
    ['The Ancient Magus’ Bride', "The Ancient Magus' Bride", []],
];

test('30-work benchmark reaches the canonical matching target', () => {
    const results = benchmarkCases.map(([query, canonicalTitle, aliases]) => calculateMatchConfidence(query, {
        canonicalTitle,
        nativeTitle: null,
        aliases,
    }));
    assert.equal(results.length, 30);
    assert.ok(results.filter((result) => result.status === 'matched').length / results.length >= 0.9);
    assert.ok(results.every((result) => result.confidence >= 0.95));
});

test('edition benchmark keeps compatible editions and rejects incompatible variants', () => {
    const base = {
        workId: 'kitsu:38',
        countryCode: 'US',
        languageCode: 'en',
        publisher: 'VIZ Media',
        volumeNumber: 1,
        editionType: 'standard',
        format: 'paperback',
    };
    const positivePairs = [
        [{ ...base, editionId: 'edition:1' }, { ...base, editionId: 'edition:1' }],
        [{ ...base, isbn13: '9781569319017' }, { ...base, isbn13: '9781569319017' }],
        [{ ...base, publisher: null }, { ...base, publisher: null }],
        ...Array.from({ length: 7 }, (_, index) => [{ ...base, volumeNumber: index + 2 }, { ...base, volumeNumber: index + 2 }]),
    ];
    const negativePairs = [
        [{ ...base, isbn13: '9781569319017' }, { ...base, isbn13: '9781591160571' }],
        [{ ...base, countryCode: 'VN', languageCode: 'vi' }, { ...base }],
        [{ ...base, editionType: 'omnibus' }, { ...base }],
        [{ ...base, format: 'ebook' }, { ...base }],
        [{ ...base, volumeNumber: 2 }, { ...base, volumeNumber: 3 }],
    ];
    const positiveMatches = positivePairs.filter(([left, right]) => matchEditions(left, right).status === 'matched').length;
    const negativeMatches = negativePairs.filter(([left, right]) => matchEditions(left, right).status === 'matched').length;
    assert.equal(positiveMatches, 10);
    assert.equal(negativeMatches, 0);
});

test('quality invariants cover stock normalization, release-gap provenance, and exact auto-test defaults', () => {
    assert.equal(normalizeStockStatus('In Stock', ''), 'inStock');
    assert.equal(normalizeStockStatus('Pre-order', ''), 'preorder');
    assert.equal(normalizeStockStatus('Temporarily unavailable', ''), 'outOfStock');
    assert.equal(normalizeStockStatus('Disponível', ''), 'inStock');
    const gap = calculateReleaseGap({
        work: { publicationStatus: 'finished', originalVolumeCount: 10 },
        editions: Array.from({ length: 10 }, (_, index) => ({
            editionId: `edition:${index + 1}`,
            countryCode: 'VN',
            languageCode: 'vi',
            volumeNumber: index + 1,
            editionType: 'standard',
            format: 'paperback',
            sourceUrl: `https://example.test/volume-${index + 1}`,
        })),
        sources: [{ sourceType: 'metadata', sourceName: 'kitsu', sourceUrl: 'https://kitsu.io' }],
    });
    assert.equal(gap.calculated, true);
    assert.ok(gap.sources.length >= 2);
    assert.equal(DEFAULT_INPUT.detectChanges, false);
    assert.equal(DEFAULT_INPUT.includeRetailOffers, false);
    assert.deepEqual(DEFAULT_INPUT.markets, [{ countryCode: 'US', languageCode: 'en' }]);
});

test('US and Vietnam market snapshots can be produced in one integration run', async () => {
    const pushed = [];
    const result = await runTitleLookup({
        input: {
            titles: ['One Piece'],
            markets: [{ countryCode: 'US', languageCode: 'en' }, { countryCode: 'VN', languageCode: 'vi' }],
            maxTitles: 1,
            detectChanges: false,
            includeReleaseGap: false,
        },
        adapters: [{
            name: 'fixture',
            search: async () => ({
                work: { workId: 'kitsu:38', canonicalTitle: 'One Piece', aliases: [], authors: [] },
                editions: [],
                match: { status: 'matched', confidence: 0.98, matchedBy: ['canonicalTitle'] },
                source: { sourceName: 'fixture', sourceType: 'metadata', sourceUrl: 'https://example.test/metadata' },
            }),
        }],
        enrichmentFor: async ({ market }) => ({
            officialAvailability: { isAvailable: market.countryCode === 'US' },
            sources: [{ sourceName: market.countryCode === 'US' ? 'viz' : 'kimdong', sourceType: 'publisher', sourceUrl: 'https://example.test/source' }],
        }),
        pushData: async (record) => pushed.push(record),
    });
    assert.equal(result.stats.snapshotsProduced, 2);
    assert.deepEqual(pushed.map((record) => record.marketCode), ['US-en', 'VN-vi']);
});
