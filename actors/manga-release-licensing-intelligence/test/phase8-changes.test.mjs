import test from 'node:test';
import assert from 'node:assert/strict';

import { compareSnapshots } from '../src/changes/compare-snapshots.js';
import { buildChangeReport } from '../src/changes/build-change-report.js';
import { loadPreviousSnapshots } from '../src/changes/load-previous-snapshots.js';
import { runTitleLookup } from '../src/runtime/run-title-lookup.js';

const snapshot = (overrides = {}) => ({
    recordType: 'titleMarketSnapshot',
    work: { workId: 'kitsu:38', canonicalTitle: 'One Piece' },
    market: { countryCode: 'US', languageCode: 'en' },
    marketCode: 'US-en',
    license: { status: 'unknown', localPublisher: null, sourceUrl: null },
    officialAvailability: { links: [], isAvailable: null },
    localizedRelease: { latestVolumeNumber: 1, latestReleaseDate: null },
    editions: [{ editionId: 'edition:1', volumeNumber: 1, editionType: 'standard', releaseDate: null }],
    offers: [{ offerId: 'bn:1', providerName: 'Barnes & Noble', editionId: 'edition:1', price: 11.99, currency: 'USD', stockStatus: 'inStock' }],
    scrapedAt: '2026-08-05T00:00:00.000Z',
    warnings: [],
    sources: [{ sourceName: 'kitsu', sourceUrl: 'https://kitsu.io' }],
    ...overrides,
});

test('change comparison detects licensing, volume, price, and stock changes', () => {
    const previous = snapshot();
    const current = snapshot({
        license: { status: 'licenseSignalFound', localPublisher: 'VIZ Media', sourceUrl: 'https://www.viz.com/one-piece' },
        localizedRelease: { latestVolumeNumber: 2, latestReleaseDate: '2026-08-01' },
        editions: [
            { editionId: 'edition:1', volumeNumber: 1, editionType: 'standard', releaseDate: null },
            { editionId: 'edition:2', volumeNumber: 2, editionType: 'standard', releaseDate: '2026-08-01' },
        ],
        offers: [{ offerId: 'bn:1', providerName: 'Barnes & Noble', editionId: 'edition:1', price: 12.99, currency: 'USD', stockStatus: 'outOfStock' }],
        scrapedAt: '2026-08-06T00:00:00.000Z',
        sources: [{ sourceName: 'viz', sourceUrl: 'https://www.viz.com/one-piece' }],
    });

    const changes = compareSnapshots(previous, current);
    const types = new Set(changes.map((change) => change.changeType));
    assert.ok(types.has('newLicenseSignal'));
    assert.ok(types.has('newLocalizedVolume'));
    assert.ok(types.has('priceIncreased'));
    assert.ok(types.has('stockChanged'));
    assert.ok(changes.every((change) => change.marketCode === 'US-en'));
});

test('comparison ignores timestamps and source/warning order', () => {
    const previous = snapshot({ sources: [{ sourceName: 'a', sourceUrl: 'https://a' }, { sourceName: 'b', sourceUrl: 'https://b' }], warnings: [{ code: 'ONE' }, { code: 'TWO' }] });
    const current = snapshot({ scrapedAt: '2027-01-01T00:00:00.000Z', sources: [{ sourceName: 'b', sourceUrl: 'https://b' }, { sourceName: 'a', sourceUrl: 'https://a' }], warnings: [{ code: 'TWO' }, { code: 'ONE' }] });
    assert.deepEqual(compareSnapshots(previous, current), []);
});

test('price changes retain currencies while stock text-only formatting is ignored', () => {
    const previous = snapshot({
        offers: [{ offerId: 'bn:1', providerName: 'Barnes & Noble', editionId: 'edition:1', price: 10, currency: 'USD', stockStatus: 'inStock', stockText: 'In Stock' }],
    });
    const current = snapshot({
        offers: [{ offerId: 'bn:1', providerName: 'Barnes & Noble', editionId: 'edition:1', price: 11, currency: 'USD', stockStatus: 'inStock', stockText: 'IN STOCK' }],
    });
    const changes = compareSnapshots(previous, current);
    const priceChange = changes.find((change) => change.changeType === 'priceIncreased');
    assert.deepEqual(priceChange.oldValue, { price: 10, currency: 'USD' });
    assert.deepEqual(priceChange.newValue, { price: 11, currency: 'USD' });
    assert.equal(changes.some((change) => change.changeType === 'stockChanged'), false);
});

test('new localized volumes are separated from newly discovered older editions', () => {
    const previous = snapshot({ localizedRelease: { latestVolumeNumber: 2, latestReleaseDate: null } });
    const current = snapshot({
        localizedRelease: { latestVolumeNumber: 2, latestReleaseDate: null },
        editions: [
            ...previous.editions,
            { editionId: 'edition:old', volumeNumber: 1, editionType: 'standard', releaseDate: null },
        ],
    });
    const changes = compareSnapshots(previous, current);
    assert.equal(changes.some((change) => change.changeType === 'newLocalizedVolume'), false);
    assert.equal(changes.some((change) => change.changeType === 'newEditionDiscovered'), true);
});

test('change report is written even when change detection is disabled', () => {
    const report = buildChangeReport({ enabled: false, generatedAt: '2026-08-05T00:00:00.000Z' });
    assert.equal(report.enabled, false);
    assert.equal(report.changesFound, 0);
    assert.deepEqual(report.changes, []);
});

test('previous dataset loader filters to snapshot records and surfaces dataset failures', async () => {
    const loaded = await loadPreviousSnapshots({
        datasetId: 'previous',
        openDataset: async () => ({ getData: async () => ({ items: [snapshot(), { recordType: 'other' }] }) }),
    });
    assert.equal(loaded.snapshots.length, 1);
    await assert.rejects(() => loadPreviousSnapshots({ datasetId: 'previous', openDataset: async () => { throw new Error('unavailable'); } }));
});

test('runner compares matching work-market history and records a compact snapshot summary', async () => {
    const pushed = [];
    const previous = snapshot();
    const result = await runTitleLookup({
        input: {
            titles: ['One Piece'],
            markets: [{ countryCode: 'US', languageCode: 'en' }],
            maxTitles: 1,
            detectChanges: true,
            previousDatasetId: 'previous',
            includeReleaseGap: false,
        },
        previousSnapshots: [previous],
        adapters: [{
            name: 'fixture',
            search: async () => ({
                work: previous.work,
                editions: previous.editions,
                match: { status: 'matched', confidence: 0.98, matchedBy: ['canonicalTitle'] },
                source: { sourceName: 'fixture', sourceType: 'metadata', sourceUrl: 'https://example.test/metadata' },
            }),
        }],
        enrichmentFor: async () => ({
            license: { status: 'licenseSignalFound', localPublisher: 'VIZ Media', sourceUrl: 'https://example.test/license' },
            localizedRelease: { latestVolumeNumber: 2, latestReleaseDate: '2026-08-01' },
            offers: [{ offerId: 'bn:1', providerName: 'Barnes & Noble', editionId: 'edition:1', price: 12.99, currency: 'USD', stockStatus: 'outOfStock' }],
        }),
        pushData: async (record) => pushed.push(record),
        now: () => new Date('2026-08-06T00:00:00.000Z'),
    });

    assert.ok(result.changes.some((change) => change.changeType === 'newLicenseSignal'));
    assert.ok(result.changes.some((change) => change.changeType === 'priceIncreased'));
    assert.equal(pushed[0].changeDetection.enabled, true);
    assert.equal(pushed[0].changeDetection.hasChanges, true);
    assert.ok(pushed[0].changeDetection.changeTypes.includes('stockChanged'));
});
