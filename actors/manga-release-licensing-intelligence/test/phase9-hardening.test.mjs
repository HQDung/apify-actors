import test from 'node:test';
import assert from 'node:assert/strict';

import { createCircuitBreaker } from '../src/runtime/circuit-breaker.js';
import { requestText } from '../src/runtime/request-text.js';
import { runTitleLookup } from '../src/runtime/run-title-lookup.js';
import { createKitsuAdapter } from '../src/sources/metadata/kitsu-adapter.js';
import { resolveWork } from '../src/sources/metadata/resolve-work.js';

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

test('request timeout is typed and does not expose response content', async () => {
    const fetchImpl = async (_url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    });

    await assert.rejects(
        () => requestText('https://example.test/public', { fetchImpl, timeoutMs: 1, sourceName: 'fixture' }),
        (error) => error.code === 'REQUEST_TIMEOUT' && error.sourceName === 'fixture',
    );
});

test('per-source circuit breaker opens after repeated retryable failures and resets', async () => {
    let now = 0;
    const breaker = createCircuitBreaker({ failureThreshold: 2, resetAfterMs: 10, now: () => now });
    const failure = Object.assign(new Error('temporary'), { retryable: true });

    await assert.rejects(() => breaker.execute(async () => { throw failure; }));
    await assert.rejects(() => breaker.execute(async () => { throw failure; }));
    await assert.rejects(
        () => breaker.execute(async () => 'blocked'),
        (error) => error.code === 'SOURCE_CIRCUIT_OPEN',
    );

    now = 11;
    assert.equal(await breaker.execute(async () => 'recovered'), 'recovered');
    assert.equal(breaker.state(), 'closed');
});

test('metadata recovery is not blocked by nested adapter and resolver retries', async () => {
    let calls = 0;
    const adapter = createKitsuAdapter({
        circuitBreaker: createCircuitBreaker({ failureThreshold: 3, resetAfterMs: 1000 }),
        fetchImpl: async () => {
            calls += 1;
            if (calls <= 2) throw new Error('temporary source outage');
            return new Response(JSON.stringify({
                data: [{ id: '38', type: 'manga', attributes: { canonicalTitle: 'One Piece', titles: { en: 'One Piece' }, status: 'current' } }],
            }), { status: 200 });
        },
    });
    const result = await resolveWork('One Piece', { adapters: [adapter], retryDelayMs: 0 });
    assert.equal(result.work.workId, 'kitsu:38');
    assert.equal(calls, 3);
});

test('one unresolved title does not discard another title result', async () => {
    const pushed = [];
    const result = await runTitleLookup({
        input: {
            titles: ['Missing title', 'One Piece'],
            markets: [{ countryCode: 'US', languageCode: 'en' }],
            maxTitles: 2,
            detectChanges: false,
            includeReleaseGap: false,
        },
        adapters: [{
            name: 'fixture',
            search: async (query) => query === 'Missing title' ? null : {
                work,
                editions: [],
                match: { status: 'matched', confidence: 0.98, matchedBy: ['canonicalTitle'] },
                source: { sourceName: 'fixture', sourceType: 'metadata', sourceUrl: 'https://example.test/metadata' },
            },
        }],
        pushData: async (record) => pushed.push(record),
        deadline: { isHardReached: () => false, isSoftReached: () => false, remainingMs: () => 0 },
    });

    assert.equal(result.stats.notFoundTitles, 1);
    assert.equal(result.stats.snapshotsProduced, 1);
    assert.equal(pushed[0].canonicalTitle, 'One Piece');
});

test('optional source failures retain source and title context in the summary', async () => {
    const result = await runTitleLookup({
        input: {
            titles: ['One Piece'],
            markets: [{ countryCode: 'US', languageCode: 'en' }],
            maxTitles: 1,
            detectChanges: false,
            includeReleaseGap: false,
        },
        adapters: [{
            name: 'fixture',
            search: async () => ({
                work,
                editions: [],
                match: { status: 'matched', confidence: 0.98, matchedBy: ['canonicalTitle'] },
                source: { sourceName: 'fixture', sourceType: 'metadata', sourceUrl: 'https://example.test/metadata' },
            }),
        }],
        enrichmentFor: async () => {
            const error = new Error('publisher unavailable');
            error.code = 'PUBLISHER_SOURCE_FAILED';
            error.sourceName = 'viz';
            throw error;
        },
        pushData: async () => {},
    });

    assert.equal(result.stats.sourceFailures.length, 1);
    assert.equal(result.stats.sourceFailures[0].sourceName, 'viz');
    assert.equal(result.stats.sourceFailures[0].queryTitle, 'One Piece');
});
