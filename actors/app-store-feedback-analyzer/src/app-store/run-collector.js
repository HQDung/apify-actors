import { collectAppStoreReviews } from "./collect-reviews.js";
import { normalizeInput } from "./normalize-input.js";
import { toDatasetRecords } from "./output-records.js";

export const runAppStoreCollection = async ({
  input,
  collect = collectAppStoreReviews,
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

  for (const appId of normalizedInput.appIds) {
    const collection = await collect({
      ...normalizedInput,
      appId,
      maxReviewsPerApp:
        normalizedInput.mode === "releaseImpact"
          ? normalizedInput.maxReviewsPerPeriod
          : normalizedInput.maxReviewsPerApp,
    });
    const normalizedFeedbackByReviewId = {};
    const analysisByReviewId = {};
    if (normalizeRecord) {
      for (const record of collection.records) {
        const normalizedFeedback = normalizeRecord(
          record,
          collection.diagnostics,
        );
        normalizedFeedbackByReviewId[record.reviewId] = normalizedFeedback;
        if (analyzeRecord)
          analysisByReviewId[record.reviewId] = await analyzeRecord(
            normalizedFeedback,
            record,
          );
        coreRecords.push({
          ...normalizedFeedback,
          ...(analysisByReviewId[record.reviewId]
            ? { analysis: analysisByReviewId[record.reviewId] }
            : {}),
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
    stats.appsProcessed += 1;
    stats.reviewRecords += collection.records.length;
    stats.diagnosticRecords += 1;
    stats.errors += collection.error ? 1 : 0;
    stats.totalRecords += records.length;
  }

  return { normalizedInput, stats, coreRecords };
};
