import { compareSnapshots } from './compare-snapshots.js';

const keyFor = (snapshot) => `${snapshot?.work?.workId ?? ''}|${snapshot?.marketCode ?? `${snapshot?.market?.countryCode}-${snapshot?.market?.languageCode}`}`;

export const buildChangeReport = ({
    enabled = false,
    previousDatasetId = null,
    previousSnapshots = [],
    currentSnapshots = [],
    changes,
    generatedAt = new Date().toISOString(),
}) => {
    const previousByKey = new Map(previousSnapshots.map((snapshot) => [keyFor(snapshot), snapshot]));
    const computedChanges = enabled && changes === undefined
        ? currentSnapshots.flatMap((snapshot) => compareSnapshots(previousByKey.get(keyFor(snapshot)), snapshot))
        : changes ?? [];
    return {
        enabled,
        previousDatasetId: previousDatasetId || null,
        titlesCompared: enabled ? currentSnapshots.filter((snapshot) => previousByKey.has(keyFor(snapshot))).length : 0,
        changesFound: computedChanges.length,
        changes: computedChanges,
        generatedAt,
    };
};
