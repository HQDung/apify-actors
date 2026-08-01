import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runGooglePlayCollection } from '../src/google-play/run-collector.js';

test('collects each requested app and publishes review plus diagnostic records', async () => {
    const published = [];
    const result = await runGooglePlayCollection({
        input: { appIds: ['com.one', 'com.two'], maxReviewsPerApp: 2 },
        collect: async ({ appId }) => ({
            records: [{ reviewId: `${appId}-review`, appId, rating: 5, text: 'ok' }],
            diagnostics: { httpStatus: 200, collectionMode: 'html' },
        }),
        onRecord: async (record) => published.push(record),
    });

    assert.equal(published.filter((record) => record.recordType === 'review').length, 2);
    assert.equal(published.filter((record) => record.recordType === 'sourceDiagnostic').length, 2);
    assert.deepEqual(result.stats, {
        appsRequested: 2,
        appsProcessed: 2,
        reviewRecords: 2,
        diagnosticRecords: 2,
        errors: 0,
        totalRecords: 4,
    });
});
