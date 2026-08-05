import { calculateMatchConfidence } from '../../identity/calculate-match-confidence.js';
import { normalizeTitle } from '../../identity/normalize-title.js';
import { withRetry } from '../../runtime/retry.js';

const compatibleWork = (left, right) =>
    normalizeTitle(left?.canonicalTitle) === normalizeTitle(right?.canonicalTitle);

const mergeUnique = (left = [], right = [], keyFor) => {
    const values = [...left, ...right];
    const seen = new Set();
    return values.filter((value) => {
        const key = keyFor(value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const mergeWork = (selected, candidates) => {
    const merged = { ...selected };
    for (const candidate of candidates) {
        if (!compatibleWork(selected, candidate)) continue;
        for (const [key, value] of Object.entries(candidate)) {
            if ((merged[key] === null || merged[key] === undefined || merged[key] === '') && value) {
                merged[key] = value;
            }
        }
        merged.aliases = mergeUnique(merged.aliases, candidate.aliases, (alias) =>
            normalizeTitle(typeof alias === 'string' ? alias : alias?.title),
        );
        merged.authors = mergeUnique(merged.authors, candidate.authors, (author) =>
            normalizeTitle(typeof author === 'string' ? author : author?.name),
        );
        merged.metadataSourceIds = { ...merged.metadataSourceIds, ...candidate.metadataSourceIds };
    }
    return merged;
};

export const resolveWork = async (
    queryTitle,
    { adapters, signal, retries = 2, retryDelayMs = 250, logFailure } = {},
) => {
    const warnings = [];
    const sources = [];
    const successfulResults = [];
    for (const adapter of adapters ?? []) {
        try {
            const result = await withRetry(
                () => adapter.search(queryTitle, { signal }),
                {
                    retries,
                    delayMs: retryDelayMs,
                    onRetry: ({ attempt }) => logFailure?.({
                        code: 'METADATA_SOURCE_RETRY',
                        sourceName: adapter.name,
                        queryTitle,
                        attempt,
                    }),
                },
            );
            if (!result?.work) {
                warnings.push({
                    code: 'METADATA_SOURCE_EMPTY',
                    sourceName: adapter.name,
                    queryTitle,
                });
                continue;
            }
            const match = result.match ?? calculateMatchConfidence(queryTitle, result.work);
            sources.push(result.source);
            successfulResults.push({ ...result, match });
        } catch (error) {
            const warning = {
                code: 'METADATA_SOURCE_FAILED',
                sourceName: adapter.name,
                queryTitle,
                message: error.message,
            };
            warnings.push(warning);
            logFailure?.(warning);
        }
    }
    if (successfulResults.length) {
        const ranked = [...successfulResults].sort((left, right) => right.match.confidence - left.match.confidence);
        const selected = ranked[0];
        const compatibleCandidates = ranked
            .slice(1)
            .filter((candidate) => compatibleWork(selected.work, candidate.work));
        return {
            ...selected,
            work: mergeWork(selected.work, compatibleCandidates.map((candidate) => candidate.work)),
            editions: mergeUnique(
                selected.editions,
                compatibleCandidates.flatMap((candidate) => candidate.editions ?? []),
                (edition) => edition.editionId ?? edition.isbn13 ?? edition.isbn10,
            ),
            sources,
            warnings,
        };
    }
    return {
        work: null,
        editions: [],
        match: { status: 'notFound', confidence: 0, matchedBy: [] },
        sources,
        warnings,
    };
};
