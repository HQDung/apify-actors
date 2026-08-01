export const toDatasetRecords = ({ appId, collection, normalizeRecord }) => {
    const reviewRecords = collection.records.map((record) => ({
        recordType: 'review',
        ...record,
        ...(normalizeRecord ? { normalizedFeedback: normalizeRecord(record, collection.diagnostics) } : {}),
    }));
    const diagnostic = {
        recordType: 'sourceDiagnostic',
        appId,
        diagnostics: collection.diagnostics,
    };
    if (collection.error) diagnostic.error = collection.error;
    return [...reviewRecords, diagnostic];
};
