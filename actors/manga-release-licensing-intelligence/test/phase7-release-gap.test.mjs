import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateReleaseGap } from '../src/releases/calculate-release-gap.js';
import { findLatestStandardRelease } from '../src/releases/find-latest-release.js';

const editions = (count, overrides = {}) => Array.from({ length: count }, (_, index) => ({
    editionId: `edition:${index + 1}`,
    workId: 'kitsu:38',
    countryCode: 'VN',
    languageCode: 'vi',
    volumeNumber: index + 1,
    volumeLabel: `Tập ${index + 1}`,
    editionType: 'standard',
    format: 'paperback',
    sourceUrl: `https://example.test/volume-${index + 1}`,
    ...overrides,
}));

test('release gap calculates equal and trailing comparable standard volumes', () => {
    const equal = calculateReleaseGap({
        work: { publicationStatus: 'finished', originalVolumeCount: 10 },
        editions: editions(10),
        sources: [{ sourceName: 'kitsu', sourceType: 'metadata', sourceUrl: 'https://kitsu.io' }],
    });
    const behind = calculateReleaseGap({
        work: { publicationStatus: 'finished', originalVolumeCount: 10 },
        editions: editions(7),
        sources: [{ sourceName: 'kitsu', sourceType: 'metadata', sourceUrl: 'https://kitsu.io' }],
    });

    assert.equal(equal.calculated, true);
    assert.equal(equal.volumeGap, 0);
    assert.equal(behind.volumeGap, 3);
    assert.ok(equal.sources.length >= 2);
});

test('omnibus, deluxe, box-set, and special editions are excluded from release gaps', () => {
    const result = calculateReleaseGap({
        work: { publicationStatus: 'finished', originalVolumeCount: 10 },
        editions: [
            ...editions(3, { editionType: 'omnibus', volumeRange: { start: 1, end: 9 } }),
            ...editions(1, { editionType: 'boxSet', volumeNumber: 10 }),
            ...editions(1, { editionType: 'special', volumeNumber: 10 }),
        ],
        sources: [{ sourceName: 'kitsu', sourceType: 'metadata', sourceUrl: 'https://kitsu.io' }],
    });
    assert.equal(result.calculated, false);
    assert.equal(result.volumeGap, null);
});

test('missing original volume evidence returns null rather than zero', () => {
    const result = calculateReleaseGap({
        work: { publicationStatus: 'releasing', originalVolumeCount: 114 },
        editions: editions(3),
        sources: [{ sourceName: 'kitsu', sourceType: 'metadata', sourceUrl: 'https://kitsu.io' }],
    });
    assert.equal(result.calculated, false);
    assert.equal(result.originalLatestVolume, null);
    assert.equal(result.volumeGap, null);
});

test('latest-release helper chooses the highest comparable standard volume', () => {
    const result = findLatestStandardRelease([
        ...editions(2),
        { ...editions(1)[0], editionType: 'omnibus', volumeNumber: 9 },
        { ...editions(1)[0], editionType: 'standard', volumeNumber: 4 },
    ]);
    assert.equal(result.volumeNumber, 4);
});
