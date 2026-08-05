import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_INPUT } from '../src/config/defaults.js';
import { normalizeInput } from '../src/input/normalize-input.js';
import { buildChangeReport, buildRunSummary } from '../src/output/run-reports.js';
import { buildSnapshot } from '../src/output/build-snapshot.js';

const resolvedWork = {
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

test('empty input normalizes to the exact Store auto-test contract', () => {
    assert.deepEqual(normalizeInput({}), DEFAULT_INPUT);
    assert.deepEqual(normalizeInput(null), DEFAULT_INPUT);
    assert.equal(DEFAULT_INPUT.titles[0], 'One Piece');
    assert.equal(DEFAULT_INPUT.markets[0].countryCode, 'US');
    assert.equal(DEFAULT_INPUT.proxyConfiguration.useApifyProxy, false);
});

test('one resolved title-market pair builds one complete snapshot', () => {
    const snapshot = buildSnapshot({
        queryTitle: 'One Piece',
        work: resolvedWork,
        market: DEFAULT_INPUT.markets[0],
        match: { status: 'matched', confidence: 0.98, matchedBy: ['canonicalTitle'] },
        scrapedAt: '2026-08-05T00:00:00.000Z',
    });

    assert.equal(snapshot.recordType, 'titleMarketSnapshot');
    assert.equal(snapshot.canonicalTitle, 'One Piece');
    assert.equal(snapshot.marketCode, 'US-en');
    assert.equal(snapshot.work.workId, 'kitsu:38');
    assert.equal(snapshot.match.status, 'matched');
    assert.ok(Array.isArray(snapshot.editions));
    assert.ok(Array.isArray(snapshot.offers));
    assert.equal(snapshot.retailSummary.offersCollected, 0);
    assert.equal(snapshot.changeDetection.enabled, false);
    assert.equal(snapshot.scrapedAt, '2026-08-05T00:00:00.000Z');
});

test('Phase 1 always creates run and change reports', () => {
    const startedAt = '2026-08-05T00:00:00.000Z';
    const finishedAt = '2026-08-05T00:00:02.000Z';
    const summary = buildRunSummary({
        actorVersion: '0.1.0',
        mode: 'titleLookup',
        startedAt,
        finishedAt,
        titlesRequested: 1,
        marketsRequested: 1,
        snapshotsExpected: 1,
        snapshotsProduced: 1,
        matchedTitles: 1,
        ambiguousTitles: 0,
        notFoundTitles: 0,
        metadataSuccesses: 1,
        licensingSuccesses: 0,
        officialAvailabilitySuccesses: 0,
        retailOfferSuccesses: 0,
        sourceFailures: [],
        warnings: [],
        defaultDatasetId: 'dataset-id',
    });
    const report = buildChangeReport({ enabled: false, generatedAt: finishedAt });

    assert.equal(summary.snapshotsProduced, 1);
    assert.equal(summary.durationSecs, 2);
    assert.deepEqual(summary.sourceFailures, []);
    assert.deepEqual(report, {
        enabled: false,
        previousDatasetId: null,
        titlesCompared: 0,
        changesFound: 0,
        changes: [],
        generatedAt: finishedAt,
    });
});
