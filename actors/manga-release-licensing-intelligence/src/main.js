import { Actor, log } from 'apify';

import { DEFAULT_ACTOR_VERSION } from './config/defaults.js';
import { normalizeInput } from './input/normalize-input.js';
import { buildRunSummary } from './output/run-reports.js';
import { buildChangeReport } from './changes/build-change-report.js';
import { loadPreviousSnapshots } from './changes/load-previous-snapshots.js';
import { createDeadline } from './runtime/deadline.js';
import { createCircuitBreakerRegistry } from './runtime/circuit-breaker.js';
import { createActorError } from './runtime/errors.js';
import { runTitleLookup } from './runtime/run-title-lookup.js';
import { createKitsuAdapter } from './sources/metadata/kitsu-adapter.js';
import { createOpenLibraryAdapter } from './sources/metadata/open-library-adapter.js';
import { collectVizSignals } from './sources/us/viz-adapter.js';
import { collectKimDongSignals } from './sources/vn/kim-dong-adapter.js';
import { collectBarnesNobleOffers, isAllowedBarnesNobleUrl } from './sources/retailers/barnes-noble-adapter.js';
import { collectFahasaOffers, isAllowedFahasaUrl } from './sources/retailers/fahasa-adapter.js';
import { deduplicateOffers } from './offers/deduplicate-offers.js';

const startedAt = new Date();
let normalizedInput = null;
let runResult = null;
let previousSnapshots = [];
let changeLoadWarnings = [];
let deadline = null;

await Actor.init();

const defaultDatasetId = () => {
    const env = Actor.getEnv?.() ?? {};
    return env.defaultDatasetId ?? process.env.APIFY_DEFAULT_DATASET_ID ?? null;
};

const saveReports = async (finishedAt, overrides = {}) => {
    const stats = runResult?.stats ?? {
        titlesRequested: normalizedInput?.titles?.length ?? 0,
        marketsRequested: normalizedInput?.markets?.length ?? 0,
        snapshotsExpected: (normalizedInput?.titles?.length ?? 0) * (normalizedInput?.markets?.length ?? 0),
        snapshotsProduced: 0,
        matchedTitles: 0,
        ambiguousTitles: 0,
        notFoundTitles: 0,
        metadataSuccesses: 0,
        licensingSuccesses: 0,
        officialAvailabilitySuccesses: 0,
        retailOfferSuccesses: 0,
        sourceFailures: [],
        warnings: [],
    };
    const summary = buildRunSummary({
        actorVersion: DEFAULT_ACTOR_VERSION,
        mode: normalizedInput?.mode ?? 'titleLookup',
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        ...stats,
        ...overrides,
        defaultDatasetId: defaultDatasetId(),
    });
    await Actor.setValue('RUN_SUMMARY', summary);
    await Actor.setValue('CHANGE_REPORT', buildChangeReport({
        enabled: normalizedInput?.detectChanges ?? false,
        previousDatasetId: normalizedInput?.previousDatasetId ?? null,
        previousSnapshots: runResult?.previousSnapshots ?? previousSnapshots,
        currentSnapshots: runResult?.snapshots ?? [],
        changes: runResult?.changes ?? [],
        generatedAt: finishedAt.toISOString(),
    }));
    return summary;
};

try {
    normalizedInput = normalizeInput((await Actor.getInput()) ?? {});
    if (normalizedInput.mode !== 'titleLookup') {
        throw createActorError('UNSUPPORTED_MODE', `Mode ${normalizedInput.mode} is reserved for a later phase.`);
    }
    if (normalizedInput.detectChanges) {
        try {
            const loaded = await loadPreviousSnapshots({
                datasetId: normalizedInput.previousDatasetId,
                openDataset: (datasetId) => Actor.openDataset(datasetId),
            });
            previousSnapshots = loaded.snapshots;
        } catch (error) {
            changeLoadWarnings = [{
                code: 'CHANGE_DATASET_UNAVAILABLE',
                previousDatasetId: normalizedInput.previousDatasetId,
                message: error.message,
            }];
            log.warning('Previous manga snapshot dataset unavailable', changeLoadWarnings[0]);
        }
    }
    if (normalizedInput.debug) log.debug('Manga input normalized', normalizedInput);
    const timeoutMs = normalizedInput.requestTimeoutSecs * 1000;
    const circuitBreakers = createCircuitBreakerRegistry();
    const adapters = [
        createKitsuAdapter({ timeoutMs, circuitBreaker: circuitBreakers.forSource('kitsu') }),
        createOpenLibraryAdapter({ timeoutMs, circuitBreaker: circuitBreakers.forSource('openlibrary') }),
    ];
    deadline = createDeadline({ softSecs: 180, hardSecs: 240, startedAt: startedAt.getTime() });
    runResult = await runTitleLookup({
        input: normalizedInput,
        adapters,
        previousSnapshots,
        changeLoadWarnings,
        deadline,
        pushData: (record) => Actor.pushData(record),
        enrichmentFor: async ({ work, market, input, signal }) => {
            let signals = {};
            if (market.countryCode === 'US' && market.languageCode === 'en' && (input.includeLicensing || input.includeOfficialAvailability)) {
                signals = await collectVizSignals({
                    work,
                    market,
                    timeoutMs,
                    maxEditions: input.maxEditionsPerTitle,
                    signal,
                    circuitBreaker: circuitBreakers.forSource('viz'),
                });
            }
            if (market.countryCode === 'VN' && market.languageCode === 'vi' && (input.includeLicensing || input.includeOfficialAvailability)) {
                signals = await collectKimDongSignals({
                    work,
                    market,
                    timeoutMs,
                    maxEditions: input.maxEditionsPerTitle,
                    signal,
                    circuitBreaker: circuitBreakers.forSource('kimdong'),
                });
            }
            if (!input.includeRetailOffers) {
                return {
                    ...signals,
                    license: input.includeLicensing ? signals.license : undefined,
                    officialAvailability: input.includeOfficialAvailability ? signals.officialAvailability : undefined,
                };
            }
            const retailerUrls = input.editionUrls ?? [];
            const retailer = market.countryCode === 'US' && market.languageCode === 'en'
                ? await collectBarnesNobleOffers({
                    work,
                    editions: [...(signals.editions ?? [])],
                    productUrls: retailerUrls.filter(isAllowedBarnesNobleUrl),
                    timeoutMs,
                    maxOffers: input.maxOffersPerEdition * Math.max(1, signals.editions?.length ?? 1),
                    signal,
                    circuitBreaker: circuitBreakers.forSource('barnesnoble'),
                })
                : market.countryCode === 'VN' && market.languageCode === 'vi'
                    ? await collectFahasaOffers({
                        work,
                        editions: [...(signals.editions ?? [])],
                        productUrls: retailerUrls.filter(isAllowedFahasaUrl),
                        timeoutMs,
                        maxOffers: input.maxOffersPerEdition * Math.max(1, signals.editions?.length ?? 1),
                        signal,
                        circuitBreaker: circuitBreakers.forSource('fahasa'),
                    })
                    : { offers: [], warnings: [], sources: [] };
            return {
                ...signals,
                license: input.includeLicensing ? signals.license : undefined,
                officialAvailability: input.includeOfficialAvailability ? signals.officialAvailability : undefined,
                offers: deduplicateOffers([...(signals.offers ?? []), ...(retailer.offers ?? [])], input.maxOffersPerEdition * Math.max(1, signals.editions?.length ?? 1)),
                retailOffers: retailer.offers ?? [],
                warnings: [...(signals.warnings ?? []), ...(retailer.warnings ?? [])],
                sources: [...(signals.sources ?? []), ...(retailer.sources ?? [])],
            };
        },
        logFailure: (failure) => log.warning('Manga source event', failure),
    });
    const finishedAt = new Date();
    const summary = await saveReports(finishedAt);
    log.info('Manga intelligence run completed', summary);
} catch (error) {
    log.error('Manga intelligence run failed', {
        code: error.code ?? 'UNEXPECTED_ERROR',
        message: error.message,
    });
    try {
        await saveReports(new Date(), {
            warnings: [
                ...(runResult?.stats?.warnings ?? []),
                { code: error.code ?? 'UNEXPECTED_ERROR', message: error.message },
            ],
        });
    } catch (reportError) {
        log.error('Manga run reports could not be saved', { message: reportError.message });
    }
    throw error;
} finally {
    deadline?.dispose?.();
    await Actor.exit();
}
