import { MIN_REVIEWS_PER_PERIOD } from '../config.js';

const rateFor = (period) => {
    if (Number.isFinite(period?.positiveRate)) return period.positiveRate;
    if (Number.isFinite(period?.reviewCount) && period.reviewCount > 0)
        return (period.positive ?? 0) / period.reviewCount;
    return 0;
};

const countFor = (period) => (Number.isInteger(period?.reviewCount) ? period.reviewCount : 0);

export const compareSentiment = ({ before, after }) => {
    const beforePositiveRate = rateFor(before);
    const afterPositiveRate = rateFor(after);
    const sentimentDelta = Number((afterPositiveRate - beforePositiveRate).toFixed(12));
    const insufficientData = countFor(before) < MIN_REVIEWS_PER_PERIOD || countFor(after) < MIN_REVIEWS_PER_PERIOD;
    let direction = 'stable';
    if (insufficientData) direction = 'insufficient_data';
    else if (sentimentDelta <= -0.1) direction = 'strongly_negative';
    else if (sentimentDelta <= -0.04) direction = 'negative';
    else if (sentimentDelta < 0.04) direction = 'stable';
    else if (sentimentDelta >= 0.1) direction = 'strongly_positive';
    else direction = 'positive';
    return {
        beforePositiveRate,
        afterPositiveRate,
        sentimentDelta,
        sentimentDeltaPercentagePoints: sentimentDelta * 100,
        direction,
    };
};
