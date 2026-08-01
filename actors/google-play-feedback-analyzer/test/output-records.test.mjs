import assert from 'node:assert/strict';
import { test } from 'node:test';

import { toDatasetRecords } from '../src/google-play/output-records.js';

test('turns collected reviews and source diagnostics into dataset records', () => {
    const records = toDatasetRecords({
        appId: 'com.todoist',
        collection: {
            records: [{ reviewId: 'review-1', appId: 'com.todoist', rating: 5, text: 'Good' }],
            diagnostics: { httpStatus: 200, collectionMode: 'html' },
        },
    });

    assert.deepEqual(records, [
        { recordType: 'review', reviewId: 'review-1', appId: 'com.todoist', rating: 5, text: 'Good' },
        {
            recordType: 'sourceDiagnostic',
            appId: 'com.todoist',
            diagnostics: { httpStatus: 200, collectionMode: 'html' },
        },
    ]);
});

test('emits source errors without manufacturing review records', () => {
    const records = toDatasetRecords({
        appId: 'com.missing',
        collection: {
            records: [],
            diagnostics: { httpStatus: 404, collectionMode: 'html' },
            error: { code: 'GOOGLE_PLAY_HTTP_ERROR', httpStatus: 404 },
        },
    });

    assert.deepEqual(records, [
        {
            recordType: 'sourceDiagnostic',
            appId: 'com.missing',
            diagnostics: { httpStatus: 404, collectionMode: 'html' },
            error: { code: 'GOOGLE_PLAY_HTTP_ERROR', httpStatus: 404 },
        },
    ]);
});

test('attaches a validated normalized feedback object when an adapter is supplied', () => {
    const records = toDatasetRecords({
        appId: 'com.todoist',
        collection: {
            records: [{ reviewId: 'review-1', appId: 'com.todoist', rating: 5, text: 'Good' }],
            diagnostics: { httpStatus: 200, collectionMode: 'html' },
        },
        normalizeRecord: (record, diagnostics) => ({
            source: { sourceRecordId: record.reviewId, sourceUrl: diagnostics.url ?? null },
            product: { productId: record.appId },
        }),
    });

    assert.deepEqual(records[0].normalizedFeedback, {
        source: { sourceRecordId: 'review-1', sourceUrl: null },
        product: { productId: 'com.todoist' },
    });
});
