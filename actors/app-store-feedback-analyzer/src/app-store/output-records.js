export const toDatasetRecords = ({
  appId,
  collection,
  normalizeRecord,
  normalizedFeedbackByReviewId = {},
  analysisByReviewId = {},
}) => {
  const reviewRecords = collection.records.map((record) => ({
    recordType: "review",
    ...record,
    ...(normalizeRecord ||
    Object.hasOwn(normalizedFeedbackByReviewId, record.reviewId)
      ? {
          normalizedFeedback:
            normalizedFeedbackByReviewId[record.reviewId] ??
            normalizeRecord(record, collection.diagnostics),
        }
      : {}),
    ...(Object.hasOwn(analysisByReviewId, record.reviewId)
      ? { analysis: analysisByReviewId[record.reviewId] }
      : {}),
  }));
  const diagnostic = {
    recordType: "sourceDiagnostic",
    appId,
    diagnostics: collection.diagnostics,
  };
  if (collection.error) diagnostic.error = collection.error;
  return [...reviewRecords, diagnostic];
};
