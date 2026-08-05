import test from 'node:test';
import assert from 'node:assert/strict';

import { parseIsbn } from '../src/identity/parse-isbn.js';
import { parseVolumeAndEdition } from '../src/identity/parse-volume.js';
import { editionIdFor } from '../src/identity/edition-id.js';
import { normalizeEdition } from '../src/identity/normalize-edition.js';
import { matchEditions, deduplicateEditions } from '../src/identity/match-edition.js';

test('ISBN-13 and ISBN-10 validate and normalize to the same edition identity', () => {
    const isbn13 = parseIsbn('978-1-56931-901-7');
    const isbn10 = parseIsbn('1569319014');

    assert.equal(isbn13.isbn13, '9781569319017');
    assert.equal(isbn13.isbn10, '1569319014');
    assert.deepEqual(isbn10, isbn13);
    assert.equal(parseIsbn('9781569319018'), null);
});

test('volume and edition parser handles standard, Vietnamese, omnibus, deluxe, box set, and digital labels', () => {
    assert.deepEqual(parseVolumeAndEdition('Volume 1'), {
        volumeNumber: 1,
        volumeLabel: 'Volume 1',
        editionType: 'standard',
        format: 'unknown',
        volumeRange: null,
    });
    assert.equal(parseVolumeAndEdition('Tập 01').volumeNumber, 1);
    assert.equal(parseVolumeAndEdition('One Piece Omnibus Volumes 1–3').editionType, 'omnibus');
    assert.deepEqual(parseVolumeAndEdition('One Piece Omnibus Volumes 1–3').volumeRange, { start: 1, end: 3 });
    assert.equal(parseVolumeAndEdition('Deluxe Hardcover Edition Volume 1').editionType, 'deluxe');
    assert.equal(parseVolumeAndEdition('One Piece Box Set 1').editionType, 'boxSet');
    assert.equal(parseVolumeAndEdition('One Piece Volume 1 ebook').format, 'ebook');
});

test('edition IDs are stable and ISBN-identical listings deduplicate', () => {
    const input = {
        workId: 'kitsu:38',
        countryCode: 'US',
        languageCode: 'en',
        publisher: 'VIZ Media',
        title: 'One Piece, Vol. 1',
        productUrl: 'https://example.test/one-piece-1',
        isbn: '9781569319017',
        format: 'paperback',
    };
    const first = normalizeEdition(input);
    const duplicate = normalizeEdition({ ...input, productUrl: 'https://example.test/one-piece-1?tracking=1' });
    assert.equal(first.editionId, duplicate.editionId);
    assert.equal(editionIdFor(input), first.editionId);
    assert.equal(deduplicateEditions([first, duplicate]).length, 1);
});

test('paperback, ebook, omnibus, and Vietnamese editions remain separate', () => {
    const paperback = normalizeEdition({
        workId: 'kitsu:38', countryCode: 'US', languageCode: 'en', publisher: 'VIZ Media',
        title: 'One Piece Volume 1', isbn: '9781569319017', format: 'paperback',
    });
    const ebook = normalizeEdition({
        workId: 'kitsu:38', countryCode: 'US', languageCode: 'en', publisher: 'VIZ Media',
        title: 'One Piece Volume 1 ebook', isbn: '9781421545257', format: 'ebook',
    });
    const omnibus = normalizeEdition({
        workId: 'kitsu:38', countryCode: 'US', languageCode: 'en', publisher: 'VIZ Media',
        title: 'One Piece Omnibus Volumes 1–3', isbn: '9781421536255', format: 'paperback',
    });
    const vietnamese = normalizeEdition({
        workId: 'kitsu:38', countryCode: 'VN', languageCode: 'vi', publisher: 'Kim Đồng',
        title: 'One Piece Tập 1', isbn: '9786042398923', format: 'paperback',
    });

    assert.equal(matchEditions(paperback, normalizeEdition({ ...paperback, productUrl: 'https://other.test' })).status, 'matched');
    assert.notEqual(matchEditions(paperback, ebook).status, 'matched');
    assert.notEqual(matchEditions(paperback, omnibus).status, 'matched');
    assert.notEqual(matchEditions(paperback, vietnamese).status, 'matched');
});
