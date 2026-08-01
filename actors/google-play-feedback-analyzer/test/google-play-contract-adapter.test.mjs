import assert from 'node:assert/strict';
import { test } from 'node:test';

import { toNormalizedFeedback } from '../src/core/google-play-contract-adapter.js';

const baseRecord = {
    reviewId: '11111111-1111-4111-8111-111111111111',
    appId: 'com.todoist',
    rating: 5,
    reviewDateText: 'June 16, 2026',
    text: 'A reliable planner',
    helpfulCount: 9,
    developerReply: { present: true, replyDateText: 'June 17, 2026', text: 'Thank you.' },
    source: { language: 'en', country: 'US' },
};

test('maps an English Google Play review to the neutral feedback contract', () => {
    const normalized = toNormalizedFeedback({
        record: baseRecord,
        diagnostics: {
            url: 'https://play.google.com/store/apps/details?id=com.todoist&hl=en&gl=US',
            collectedAt: '2026-08-01T04:38:20.000Z',
        },
    });

    assert.equal(normalized.source.platform, 'google-play');
    assert.equal(normalized.source.sourceRecordId, baseRecord.reviewId);
    assert.equal(normalized.source.sourceUrl, 'https://play.google.com/store/apps/details?id=com.todoist&hl=en&gl=US');
    assert.equal(normalized.product.productType, 'app');
    assert.equal(normalized.product.productId, 'com.todoist');
    assert.equal(normalized.feedback.createdAt, '2026-06-16T00:00:00.000Z');
    assert.equal(normalized.feedback.isPositive, true);
    assert.equal(normalized.feedback.rating, 5);
    assert.deepEqual(normalized.sourceMetadata, {
        helpfulCount: 9,
        developerReply: baseRecord.developerReply,
    });
});

test('parses Vietnamese review dates and leaves unknown product metadata nullable', () => {
    const normalized = toNormalizedFeedback({
        record: {
            ...baseRecord,
            rating: 3,
            reviewDateText: '30 tháng 7, 2026',
            source: { language: 'vi', country: 'VN' },
            developerReply: null,
        },
    });

    assert.equal(normalized.feedback.createdAt, '2026-07-30T00:00:00.000Z');
    assert.equal(normalized.feedback.sourceLanguage, 'vi');
    assert.equal(normalized.feedback.isPositive, null);
    assert.equal(normalized.product.version, null);
    assert.equal(normalized.environmentContext.device, null);
});
