import { collectGooglePlayReviews } from './collect-reviews.js';
import { normalizeInput } from './normalize-input.js';
import { toDatasetRecords } from './output-records.js';

export const runGooglePlayCollection = async ({
    input,
    collect = collectGooglePlayReviews,
    onRecord = async () => {},
}) => {
    const normalizedInput = normalizeInput(input);
    const stats = {
        appsRequested: normalizedInput.appIds.length,
        appsProcessed: 0,
        reviewRecords: 0,
        diagnosticRecords: 0,
        errors: 0,
        totalRecords: 0,
    };

    for (const appId of normalizedInput.appIds) {
        const collection = await collect({ ...normalizedInput, appId });
        const records = toDatasetRecords({ appId, collection });
        for (const record of records) await onRecord(record);
        stats.appsProcessed += 1;
        stats.reviewRecords += collection.records.length;
        stats.diagnosticRecords += 1;
        stats.errors += collection.error ? 1 : 0;
        stats.totalRecords += records.length;
    }

    return { normalizedInput, stats };
};
