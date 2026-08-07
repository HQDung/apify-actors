const hash = (value) => {
    let result = 0;
    for (const character of String(value)) {
        result = Math.imul(result, 31) + character.charCodeAt(0);
    }
    return Math.abs(result);
};

const keyFor = (record, index) => record.id ?? record.reviewId ?? record.source?.sourceRecordId ?? index;

export const sampleDeterministically = (records, limit, seed) => {
    if (!Array.isArray(records)) throw new Error('records must be an array.');
    if (!Number.isInteger(limit) || limit < 1) throw new Error('limit must be a positive integer.');
    if (records.length <= limit) return records.slice();
    return records
        .map((record, index) => ({ record, order: hash(`${seed}|${keyFor(record, index)}`) }))
        .sort(
            (left, right) =>
                left.order - right.order ||
                String(keyFor(left.record, 0)).localeCompare(String(keyFor(right.record, 0))),
        )
        .slice(0, limit)
        .map(({ record }) => record);
};
