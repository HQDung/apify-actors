import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'raw');
const fixtureNames = [
    'youtube-global-large-en-us.json',
    'youtube-global-large-vi-vn.json',
    'zalo-vietnam-en-us.json',
    'zalo-vietnam-vi-vn.json',
    'todoist-smaller-en-us.json',
    'todoist-smaller-vi-vn.json',
];

test('Google Play technical-spike fixtures remain redacted and structurally complete', async () => {
    for (const fixtureName of fixtureNames) {
        const fixture = JSON.parse(await readFile(join(fixtureDir, fixtureName), 'utf8'));
        assert.equal(fixture.request.status, 200, fixtureName);
        assert.match(fixture.request.url, /^https:\/\/play\.google\.com\/store\/apps\/details/);
        assert.equal(fixture.page.uniqueReviewCards, fixture.reviews.length, fixtureName);
        assert.ok(fixture.reviews.length > 0, fixtureName);
        assert.equal(fixture.redaction.authorNames, 'omitted', fixtureName);
        assert.equal(fixture.redaction.reviewText.includes('omitted'), true, fixtureName);
        for (const review of fixture.reviews) {
            assert.match(review.reviewId, /^[0-9a-f-]{36}$/i, fixtureName);
            assert.ok(review.rating >= 1 && review.rating <= 5, fixtureName);
            assert.match(review.textSha256, /^sha256:[0-9a-f]{64}$/, fixtureName);
        }
    }
});
