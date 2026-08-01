export const toDatasetRecords = ({ appId, collection }) => {
    const reviewRecords = collection.records.map((record) => ({ recordType: 'review', ...record }));
    const diagnostic = {
        recordType: 'sourceDiagnostic',
        appId,
        diagnostics: collection.diagnostics,
    };
    if (collection.error) diagnostic.error = collection.error;
    return [...reviewRecords, diagnostic];
};
