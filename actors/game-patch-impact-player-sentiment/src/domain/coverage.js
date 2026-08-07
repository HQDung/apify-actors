import { MIN_REVIEWS_PER_PERIOD } from '../config.js';

export const buildPeriodCoverage = ({
    requestedStart,
    requestedEnd,
    observedTimestamps = [],
    scannedReviews = 0,
    analyzedReviews = 0,
    reachedRequestedStart = false,
    truncatedByPageLimit = false,
}) => {
    const validTimestamps = observedTimestamps
        .map((value) => new Date(value))
        .filter((value) => !Number.isNaN(value.getTime()))
        .sort((left, right) => left.getTime() - right.getTime());
    const enoughSamples = analyzedReviews >= MIN_REVIEWS_PER_PERIOD;
    let coverageStatus = 'partial';
    if (!enoughSamples) coverageStatus = 'insufficient';
    else if (reachedRequestedStart && !truncatedByPageLimit) coverageStatus = 'full';
    return {
        requestedStart,
        requestedEnd,
        observedOldestReviewAt: validTimestamps[0]?.toISOString() ?? null,
        observedNewestReviewAt: validTimestamps.at(-1)?.toISOString() ?? null,
        scannedReviews,
        analyzedReviews,
        reachedRequestedStart,
        truncatedByPageLimit,
        coverageStatus,
    };
};
