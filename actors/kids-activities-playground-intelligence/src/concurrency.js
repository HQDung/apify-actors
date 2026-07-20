export const mapInBatches = async (items, batchSize, worker) => {
  const results = [];
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    results.push(...(await Promise.all(batch.map(worker))));
  }
  return results;
};
