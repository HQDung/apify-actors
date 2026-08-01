import { collectGooglePlayReviews } from './collect-reviews.js';
import { normalizeInput } from './normalize-input.js';
import { toDatasetRecords } from './output-records.js';

export const runGooglePlayCollection = async ({
    input,
    collect = collectGooglePlayReviews,
    normalizeRecord,
    analyzeRecord,
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
    const coreRecords = [];
    const requests =
        normalizedInput.mode === 'releaseImpact'
            ? normalizedInput.appIds.flatMap((appId) =>
                  normalizedInput.languages.flatMap((language) =>
                      normalizedInput.countries.map((country) => ({
                          appId,
                          language,
                          country,
                          maxReviewsPerApp: normalizedInput.maxReviewsPerPeriod,
                      })),
                  ),
              )
            : normalizedInput.appIds.map((appId) => ({
                  appId,
                  language: normalizedInput.language,
                  country: normalizedInput.country,
                  maxReviewsPerApp: normalizedInput.maxReviewsPerApp,
              }));
    if (normalizedInput.mode === 'releaseImpact') {
        stats.requestsRequested = requests.length;
        stats.requestsProcessed = 0;
    }

    const processedApps = new Set();
    for (const request of requests) {
        const { appId } = request;
        const collection = await collect({ ...normalizedInput, ...request });
        const normalizedFeedbackByReviewId = {};
        const analysisByReviewId = {};
        if (normalizeRecord) {
            for (const record of collection.records) {
                const normalizedFeedback = normalizeRecord(record, collection.diagnostics);
                normalizedFeedbackByReviewId[record.reviewId] = normalizedFeedback;
                if (analyzeRecord)
                    analysisByReviewId[record.reviewId] = await analyzeRecord(normalizedFeedback, record);
                coreRecords.push({
                    ...normalizedFeedback,
                    ...(analysisByReviewId[record.reviewId] ? { analysis: analysisByReviewId[record.reviewId] } : {}),
                });
            }
        }
        const records = toDatasetRecords({
            appId,
            collection,
            normalizeRecord,
            normalizedFeedbackByReviewId,
            analysisByReviewId,
        });
        for (const record of records) await onRecord(record);
        processedApps.add(appId);
        stats.appsProcessed = processedApps.size;
        if (normalizedInput.mode === 'releaseImpact') stats.requestsProcessed += 1;
        stats.reviewRecords += collection.records.length;
        stats.diagnosticRecords += 1;
        stats.errors += collection.error ? 1 : 0;
        stats.totalRecords += records.length;
    }

    return { normalizedInput, stats, coreRecords };
};
