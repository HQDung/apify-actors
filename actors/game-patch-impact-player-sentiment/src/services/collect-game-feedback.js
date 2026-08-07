import { assignReviewPeriod, resolveComparisonWindow } from '../domain/comparison-window.js';
import { buildPeriodCoverage } from '../domain/coverage.js';
import { sampleDeterministically } from '../domain/sampling.js';

const fallbackGame = (appId) => ({
    steamAppId: String(appId),
    gameName: null,
    storeUrl: `https://store.steampowered.com/app/${encodeURIComponent(appId)}/`,
});

const coverageFor = ({ period, window, candidates, collection, sample }) =>
    buildPeriodCoverage({
        requestedStart: window.startAt,
        requestedEnd: window.endAt,
        observedTimestamps: candidates.map(({ createdAt }) => createdAt),
        scannedReviews: collection.scannedByPeriod?.[period] ?? candidates.length,
        analyzedReviews: sample.length,
        reachedRequestedStart: collection.reachedRequestedStart,
        truncatedByPageLimit: collection.truncatedByPageLimit,
    });

const warningsFor = ({ periods, collection, metadataUnavailable }) => {
    const warnings = [];
    if (metadataUnavailable) warnings.push('GAME_NAME_UNAVAILABLE');
    if (periods.before.coverage.coverageStatus === 'partial' || periods.after.coverage.coverageStatus === 'partial')
        warnings.push('PARTIAL_TIME_COVERAGE');
    if (periods.before.coverage.coverageStatus === 'insufficient') warnings.push('LOW_SAMPLE_BEFORE');
    if (periods.after.coverage.coverageStatus === 'insufficient') warnings.push('LOW_SAMPLE_AFTER');
    if (collection.cursorLoopDetected) warnings.push('REVIEW_CURSOR_LOOP');
    return [...new Set(warnings)];
};

export const collectGameFeedback = async ({
    appId,
    input,
    now = new Date().toISOString(),
    patchBoundary = null,
    metadataAdapter,
    reviewsAdapter,
}) => {
    let game = fallbackGame(appId);
    let metadataUnavailable = false;
    try {
        game = await metadataAdapter.fetchGameMetadata(appId);
    } catch {
        metadataUnavailable = true;
    }

    const windows = resolveComparisonWindow({
        mode: input.comparisonMode,
        windowDays: input.windowDays,
        patchDate: input.patchDate,
        patchBoundary,
        now,
    });
    let collection;
    try {
        collection = await reviewsAdapter.iterateRecentReviews({
            appId,
            language: input.language,
            includeOffTopicReviews: input.includeOffTopicReviews,
            windows,
            now,
        });
    } catch (error) {
        return {
            status: 'failed',
            errorCode: 'STEAM_REVIEWS_UNAVAILABLE',
            game,
            windows,
            periods: {
                before: {
                    reviews: [],
                    coverage: buildPeriodCoverage({
                        requestedStart: windows.before.startAt,
                        requestedEnd: windows.before.endAt,
                    }),
                },
                after: {
                    reviews: [],
                    coverage: buildPeriodCoverage({
                        requestedStart: windows.after.startAt,
                        requestedEnd: windows.after.endAt,
                    }),
                },
            },
            warnings: ['STEAM_REVIEWS_UNAVAILABLE'],
            errorMessage: error.message.slice(0, 240),
            stats: { pagesFetched: 0, reviewsScanned: 0 },
        };
    }

    const candidates = {
        before: collection.reviews.filter((review) => assignReviewPeriod(review.createdAt, windows) === 'before'),
        after: collection.reviews.filter((review) => assignReviewPeriod(review.createdAt, windows) === 'after'),
    };
    const samples = {
        before: sampleDeterministically(
            candidates.before,
            input.maxReviewsPerPeriod,
            `${appId}|before|${windows.before.startAt}|${windows.before.endAt}`,
        ),
        after: sampleDeterministically(
            candidates.after,
            input.maxReviewsPerPeriod,
            `${appId}|after|${windows.after.startAt}|${windows.after.endAt}`,
        ),
    };
    const periods = {
        before: {
            reviews: samples.before,
            coverage: coverageFor({
                period: 'before',
                window: windows.before,
                candidates: candidates.before,
                collection,
                sample: samples.before,
            }),
        },
        after: {
            reviews: samples.after,
            coverage: coverageFor({
                period: 'after',
                window: windows.after,
                candidates: candidates.after,
                collection,
                sample: samples.after,
            }),
        },
    };
    return {
        status: 'ok',
        game,
        windows,
        periods,
        warnings: warningsFor({ periods, collection, metadataUnavailable }),
        stats: {
            pagesFetched: collection.pagesFetched,
            reviewsScanned: collection.scannedReviews,
            reviewsAnalyzed: samples.before.length + samples.after.length,
        },
    };
};
