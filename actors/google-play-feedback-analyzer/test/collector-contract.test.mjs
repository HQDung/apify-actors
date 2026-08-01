import assert from 'node:assert/strict';
import { test } from 'node:test';

import { collectGooglePlayReviews } from '../src/google-play/collect-reviews.js';
import { normalizeInput } from '../src/google-play/normalize-input.js';
import { parseStoreHtml } from '../src/google-play/parse-store-html.js';

const reviewHtml = `
  <div class="EGFGHd">
    <header data-review-id="11111111-1111-4111-8111-111111111111">
      <div class="Jx4nYe">
        <div aria-label="Rated 4 stars out of five stars" role="img"></div>
        <span class="bp9Aid">July 31, 2026</span>
      </div>
    </header>
    <div class="h3YV2d">Helpful &amp; stable</div>
    <div data-original-thumbs-up-count="12"></div>
    <div class="ocpBU">
      <div class="I9Jtec">August 1, 2026</div>
      <div class="ras4vb"><div>Thanks for the feedback.</div></div>
    </div>
  </div>
`;

test('normalizes Google Play collection input with safe bounds', () => {
    assert.deepEqual(
        normalizeInput({
            appIds: ['com.todoist'],
            language: 'vi',
            country: 'vn',
            maxReviewsPerApp: 12,
            sort: 'newest',
        }),
        {
            appIds: ['com.todoist'],
            language: 'vi',
            country: 'VN',
            maxReviewsPerApp: 12,
            sort: 'newest',
            useBrowserFallback: false,
            requestTimeoutSecs: 30,
        },
    );
});

test('parses a public Store review card without reviewer identity', () => {
    const parsed = parseStoreHtml(reviewHtml, { appId: 'com.todoist', language: 'en', country: 'US' });
    assert.deepEqual(parsed.reviews, [
        {
            reviewId: '11111111-1111-4111-8111-111111111111',
            appId: 'com.todoist',
            rating: 4,
            reviewDateText: 'July 31, 2026',
            text: 'Helpful & stable',
            helpfulCount: 12,
            developerReply: {
                present: true,
                replyDateText: 'August 1, 2026',
                text: 'Thanks for the feedback.',
            },
            source: { language: 'en', country: 'US' },
        },
    ]);
});

test('collects records and reports a bounded HTTP source diagnostic', async () => {
    const result = await collectGooglePlayReviews({
        appId: 'com.todoist',
        language: 'en',
        country: 'US',
        maxReviewsPerApp: 1,
        fetchImpl: async () => new Response(reviewHtml, { status: 200 }),
    });
    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].reviewId, '11111111-1111-4111-8111-111111111111');
    assert.equal(result.diagnostics.httpStatus, 200);
    assert.equal(result.diagnostics.collectionMode, 'html');
});

test('returns a machine-readable error for non-success Store responses', async () => {
    const result = await collectGooglePlayReviews({
        appId: 'com.missing',
        language: 'en',
        country: 'US',
        fetchImpl: async () => new Response('Not found', { status: 404 }),
    });
    assert.deepEqual(result.records, []);
    assert.equal(result.error.code, 'GOOGLE_PLAY_HTTP_ERROR');
    assert.equal(result.error.httpStatus, 404);
});

test('does not silently ignore the deferred browser fallback flag', async () => {
    const result = await collectGooglePlayReviews({
        appId: 'com.todoist',
        language: 'en',
        country: 'US',
        maxReviewsPerApp: 1,
        useBrowserFallback: true,
        fetchImpl: async () => new Response('<html></html>', { status: 200 }),
    });

    assert.deepEqual(result.records, []);
    assert.equal(result.error.code, 'GOOGLE_PLAY_BROWSER_FALLBACK_DEFERRED');
});
