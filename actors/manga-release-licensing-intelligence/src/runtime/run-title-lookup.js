import { buildSnapshot } from '../output/build-snapshot.js';
import { compareSnapshots } from '../changes/compare-snapshots.js';
import { deduplicateEditions } from '../identity/match-edition.js';
import { calculateReleaseGap } from '../releases/calculate-release-gap.js';
import { findLatestStandardRelease } from '../releases/find-latest-release.js';
import { resolveWork } from '../sources/metadata/resolve-work.js';
import { createDeadline } from './deadline.js';
import { createActorError } from './errors.js';

const SOURCE_FAILURE_CODES = new Set([
    'METADATA_SOURCE_FAILED',
    'PUBLISHER_SOURCE_FAILED',
    'OFFICIAL_AVAILABILITY_FAILED',
    'RETAILER_SOURCE_FAILED',
    'RATE_LIMITED',
    'REQUEST_TIMEOUT',
    'SOURCE_CIRCUIT_OPEN',
]);

const actorError = (code, message, details = {}) => createActorError(code, message, details);

export const runTitleLookup = async ({
    input,
    adapters,
    pushData,
    enrichmentFor,
    previousSnapshots = [],
    changeLoadWarnings = [],
    now = () => new Date(),
    deadline = createDeadline(),
    logFailure,
}) => {
    const startedAt = now();
    const snapshots = [];
    const changes = [];
    const warnings = [];
    warnings.push(...changeLoadWarnings);
    const sourceFailures = [];
    const sourceFailureKeys = new Set();
    const addSourceFailures = (entries, context = {}) => {
        for (const entry of entries ?? []) {
            if (!SOURCE_FAILURE_CODES.has(entry?.code)) continue;
            const failure = { ...entry, ...context };
            const key = JSON.stringify([failure.code, failure.sourceName, failure.queryTitle, failure.market?.countryCode, failure.market?.languageCode, failure.sourceUrl]);
            if (!sourceFailureKeys.has(key)) {
                sourceFailureKeys.add(key);
                sourceFailures.push(failure);
            }
        }
    };
    let matchedTitles = 0;
    let ambiguousTitles = 0;
    let notFoundTitles = 0;
    let metadataSuccesses = 0;
    let licensingSuccesses = 0;
    let officialAvailabilitySuccesses = 0;
    let retailOfferSuccesses = 0;

    for (const queryTitle of input.titles.slice(0, input.maxTitles)) {
        if (deadline.isHardReached()) {
            warnings.push({ code: 'RUN_DEADLINE_REACHED', queryTitle });
            break;
        }
        const resolved = await resolveWork(queryTitle, {
            adapters,
            signal: deadline.signal,
            retryDelayMs: Math.min(250, Math.max(0, deadline.remainingMs() / 100)),
            logFailure: (failure) => {
                logFailure?.(failure);
                addSourceFailures([failure], { queryTitle });
            },
        });
        warnings.push(...resolved.warnings);
        addSourceFailures(resolved.warnings, { queryTitle });
        if (!resolved.work) {
            notFoundTitles += 1;
            if (input.titles.length === 1) {
                throw actorError('TITLE_NOT_FOUND', `No metadata provider resolved "${queryTitle}".`, {
                    queryTitle,
                    warnings: resolved.warnings,
                });
            }
            continue;
        }
        if (resolved.match.status !== 'matched') {
            ambiguousTitles += 1;
            if (input.titles.length === 1) {
                throw actorError('AMBIGUOUS_TITLE', `Metadata providers returned an ambiguous match for "${queryTitle}".`, {
                    queryTitle,
                    match: resolved.match,
                });
            }
            continue;
        }
        matchedTitles += 1;
        metadataSuccesses += 1;
        for (const market of input.markets) {
            if (deadline.isHardReached()) {
                warnings.push({ code: 'RUN_DEADLINE_REACHED', queryTitle, market });
                break;
            }
            let enrichment = {};
            let enrichmentWarnings = [];
            if (enrichmentFor && deadline.isSoftReached()) {
                warnings.push({ code: 'RUN_DEADLINE_REACHED', queryTitle, market, phase: 'optional-enrichment' });
            } else if (enrichmentFor) {
                try {
                    enrichment = await enrichmentFor({ queryTitle, work: resolved.work, market, input, signal: deadline.signal });
                    warnings.push(...(enrichment.warnings ?? []));
                    addSourceFailures(enrichment.warnings, { queryTitle, market });
                    if (enrichment.license?.status && enrichment.license.status !== 'unknown') licensingSuccesses += 1;
                    if (enrichment.officialAvailability?.isAvailable !== null && enrichment.officialAvailability?.isAvailable !== undefined) officialAvailabilitySuccesses += 1;
                    if (enrichment.retailOffers?.length) retailOfferSuccesses += 1;
                } catch (error) {
                    const failure = {
                        code: error.code ?? 'OPTIONAL_SOURCE_FAILED',
                        sourceName: error.sourceName ?? error.adapterName ?? undefined,
                        queryTitle,
                        market,
                        message: error.message,
                    };
                    warnings.push(failure);
                    addSourceFailures([failure]);
                    enrichmentWarnings.push(failure);
                    logFailure?.(failure);
                }
            }
            const combinedEditions = deduplicateEditions([...(resolved.editions ?? []), ...(enrichment.editions ?? [])]);
            const marketEditions = combinedEditions.filter((edition) =>
                edition.countryCode === market.countryCode && edition.languageCode === market.languageCode,
            );
            const latestLocalized = findLatestStandardRelease(marketEditions);
            const localizedRelease = {
                ...(enrichment.localizedRelease ?? {}),
                ...(latestLocalized && (enrichment.localizedRelease?.latestVolumeNumber == null)
                    ? {
                          latestVolumeNumber: latestLocalized.volumeNumber,
                          latestVolumeLabel: latestLocalized.volumeLabel,
                          latestReleaseDate: latestLocalized.releaseDate,
                      }
                    : {}),
            };
            const releaseGap = input.includeReleaseGap
                ? calculateReleaseGap({
                      work: resolved.work,
                      editions: marketEditions,
                      sources: [...resolved.sources, ...(enrichment.sources ?? [])],
                  })
                : enrichment.releaseGap;
            const snapshot = buildSnapshot({
                queryTitle,
                work: resolved.work,
                market,
                match: resolved.match,
                license: enrichment.license,
                localizedRelease,
                releaseGap,
                officialAvailability: enrichment.officialAvailability,
                editions: combinedEditions,
                offers: enrichment.offers,
                changeDetection: enrichment.changeDetection,
                warnings: [...resolved.warnings, ...(enrichment.warnings ?? []), ...enrichmentWarnings],
                sources: [...resolved.sources, ...(enrichment.sources ?? [])],
                scrapedAt: startedAt.toISOString(),
            });
            if (input.detectChanges) {
                const previous = previousSnapshots.find((candidate) =>
                    candidate?.work?.workId === snapshot.work.workId && candidate?.marketCode === snapshot.marketCode,
                );
                const snapshotChanges = compareSnapshots(previous, snapshot);
                changes.push(...snapshotChanges);
                snapshot.changeDetection = {
                    enabled: true,
                    hasChanges: snapshotChanges.length > 0,
                    changeTypes: [...new Set(snapshotChanges.map((item) => item.changeType))],
                };
                if (previous && changeLoadWarnings.length) {
                    snapshot.warnings = [...snapshot.warnings, ...changeLoadWarnings];
                }
            }
            await pushData(snapshot);
            snapshots.push(snapshot);
        }
    }

    if (!snapshots.length) {
        throw actorError('TITLE_NOT_FOUND', 'No title-market snapshots could be produced.');
    }
    return {
        snapshots,
        changes,
        previousSnapshots,
        stats: {
            titlesRequested: input.titles.length,
            marketsRequested: input.markets.length,
            snapshotsExpected: input.titles.length * input.markets.length,
            snapshotsProduced: snapshots.length,
            matchedTitles,
            ambiguousTitles,
            notFoundTitles,
            metadataSuccesses,
            licensingSuccesses,
            officialAvailabilitySuccesses,
            retailOfferSuccesses,
            sourceFailures,
            warnings,
        },
    };
};

export { actorError };
