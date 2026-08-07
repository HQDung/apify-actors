import { assertIntegerInRange, COMPARISON_MODES, DEFAULT_INPUT, LANGUAGE_CODES } from '../config.js';

const cloneDefaults = () => ({ ...DEFAULT_INPUT, steamAppIds: [...DEFAULT_INPUT.steamAppIds] });

const normalizeAppIds = (value) => {
    if (value === undefined) return cloneDefaults().steamAppIds;
    if (!Array.isArray(value) || value.length === 0) throw new Error('At least one Steam App ID is required.');
    if (value.length > 10) throw new Error('steamAppIds must contain between 1 and 10 App IDs.');
    const ids = value.map((entry) => String(entry).trim());
    if (ids.some((entry) => !/^\d+$/.test(entry))) throw new Error('steamAppIds must contain numeric Steam App IDs.');
    return [...new Set(ids)];
};

const normalizePatchDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('patchDate must use YYYY-MM-DD format.');
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        throw new Error('patchDate must be a valid calendar date.');
    }
    return parsed.toISOString();
};

export const normalizeInput = (input = {}) => {
    if (input === null || typeof input !== 'object' || Array.isArray(input))
        throw new Error('Input must be an object.');
    const result = {
        steamAppIds: normalizeAppIds(input.steamAppIds),
        comparisonMode: input.comparisonMode ?? DEFAULT_INPUT.comparisonMode,
        windowDays: input.windowDays ?? DEFAULT_INPUT.windowDays,
        maxReviewsPerPeriod: input.maxReviewsPerPeriod ?? DEFAULT_INPUT.maxReviewsPerPeriod,
        language: input.language ?? DEFAULT_INPUT.language,
        includeOffTopicReviews: input.includeOffTopicReviews ?? DEFAULT_INPUT.includeOffTopicReviews,
        includeEvidence: input.includeEvidence ?? DEFAULT_INPUT.includeEvidence,
    };

    if (!COMPARISON_MODES.includes(result.comparisonMode))
        throw new Error(`comparisonMode must be one of: ${COMPARISON_MODES.join(', ')}.`);
    assertIntegerInRange(result.windowDays, 'windowDays', 1, 30);
    assertIntegerInRange(result.maxReviewsPerPeriod, 'maxReviewsPerPeriod', 10, 250);
    if (!LANGUAGE_CODES.includes(result.language))
        throw new Error(`language must be one of: ${LANGUAGE_CODES.join(', ')}.`);
    if (typeof result.includeOffTopicReviews !== 'boolean')
        throw new Error('includeOffTopicReviews must be a boolean.');
    if (typeof result.includeEvidence !== 'boolean') throw new Error('includeEvidence must be a boolean.');

    if (result.comparisonMode === 'custom_patch_date') {
        if (input.patchDate === undefined || input.patchDate === null || input.patchDate === '')
            throw new Error('patchDate is required for custom_patch_date.');
        result.patchDate = normalizePatchDate(input.patchDate);
    }
    return result;
};
