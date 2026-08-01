import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    collectAppStoreReviews,
    collectGooglePlayReviews,
    parseAppStoreReviews,
    parseGooglePlayReviews,
} from '../src/index.js';

const googleHtml = `
  <div class="EGFGHd">
    <header data-review-id="google-review-1">
      <div aria-label="Rated 4 stars out of five stars"></div>
      <span class="bp9Aid">July 31, 2026</span>
    </header>
    <div class="h3YV2d">Helpful and stable</div>
    <div data-original-thumbs-up-count="12"></div>
  </div>
`;

const appleFeed = JSON.stringify({
    feed: {
        entry: [{
            id: { label: 'https://itunes.apple.com/us/review?id=apple-review-1' },
            title: { label: 'Stable app' },
            content: { label: 'Works well.' },
            updated: { label: '2026-07-30T08:00:00-07:00' },
            'im:rating': { label: '5' },
            'im:version': { label: '4.2.0' },
            'im:voteSum': { label: '9' },
        }],
    },
});

test('parses Google Play and Apple App Store review payloads through one source package', () => {
    assert.equal(parseGooglePlayReviews(googleHtml, { appId: 'com.example.app', language: 'en', country: 'US' })[0].reviewId, 'google-review-1');
    assert.equal(parseAppStoreReviews(appleFeed, { appId: '123456789', language: 'en', country: 'US' })[0].reviewId, 'apple-review-1');
});

test('collects Google Play reviews with source diagnostics', async () => {
    const result = await collectGooglePlayReviews({
        appId: 'com.example.app',
        language: 'en',
        country: 'US',
        maxReviewsPerApp: 1,
        fetchImpl: async () => new Response(googleHtml, { status: 200 }),
    });
    assert.equal(result.records.length, 1);
    assert.equal(result.diagnostics.collectionMode, 'html');
    assert.equal(result.error, undefined);
});

test('collects Apple App Store reviews with source diagnostics', async () => {
    const result = await collectAppStoreReviews({
        appId: '123456789',
        language: 'en',
        country: 'US',
        maxReviewsPerApp: 1,
        maxPagesPerApp: 1,
        fetchImpl: async () => new Response(appleFeed, { status: 200 }),
    });
    assert.equal(result.records.length, 1);
    assert.equal(result.diagnostics.collectionMode, 'rss-json');
    assert.equal(result.error, undefined);
});

test('returns platform-scoped errors without discarding an already collected source sample', async () => {
    const result = await collectAppStoreReviews({
        appId: '123456789',
        language: 'en',
        country: 'US',
        maxReviewsPerApp: 2,
        maxPagesPerApp: 2,
        fetchImpl: async (url) => String(url).includes('/page=1/') ? new Response(appleFeed, { status: 200 }) : new Response('missing', { status: 429 }),
    });
    assert.equal(result.records.length, 1);
    assert.equal(result.error.code, 'APP_STORE_HTTP_ERROR');
    assert.equal(result.error.httpStatus, 429);
});
