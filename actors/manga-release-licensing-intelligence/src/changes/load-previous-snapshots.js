export const loadPreviousSnapshots = async ({ datasetId, openDataset }) => {
    if (!datasetId) return { snapshots: [] };
    const dataset = await openDataset(datasetId);
    const data = await dataset.getData({ limit: 100_000 });
    return {
        snapshots: (data?.items ?? []).filter((item) => item?.recordType === 'titleMarketSnapshot'),
    };
};
