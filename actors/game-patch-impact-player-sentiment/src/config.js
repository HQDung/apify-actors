export const LANGUAGE_CODES = [
    'english',
    'all',
    'schinese',
    'tchinese',
    'german',
    'french',
    'spanish',
    'brazilian',
    'russian',
    'japanese',
    'koreana',
    'vietnamese',
];

export const COMPARISON_MODES = ['recent_vs_previous', 'latest_patch', 'custom_patch_date'];

export const DEFAULT_INPUT = Object.freeze({
    steamAppIds: ['646570'],
    comparisonMode: 'recent_vs_previous',
    windowDays: 7,
    maxReviewsPerPeriod: 40,
    language: 'english',
    includeOffTopicReviews: false,
    includeEvidence: true,
});

export const MAX_SCAN_PAGES_PER_GAME = 30;
export const REVIEWS_PER_PAGE = 100;
export const MAX_NEWS_ITEMS = 20;
export const HTTP_TIMEOUT_MS = 15_000;
export const MAX_RETRIES = 3;
export const RETRY_BASE_MS = 500;
export const MAX_CONCURRENT_GAMES = 3;
export const MIN_REVIEWS_PER_PERIOD = 8;
export const PATCH_CONFIDENCE_THRESHOLD = 0.65;

export const assertIntegerInRange = (value, name, minimum, maximum) => {
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
    }
};
