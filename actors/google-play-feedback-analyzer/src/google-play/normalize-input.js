const PACKAGE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]+$/;
const SORTS = new Set(['mostRelevant', 'newest']);
const OUTPUT_LANGUAGES = new Set(['english', 'original']);

const invalidInput = (message) => {
    const error = new Error(message);
    error.code = 'GOOGLE_PLAY_INVALID_INPUT';
    return error;
};

const normalizeAppIds = (input) => {
    const values = input.appIds ?? (input.appId ? [input.appId] : []);
    if (!Array.isArray(values) || values.length < 1 || values.length > 20) {
        throw invalidInput('appIds must contain between 1 and 20 package IDs');
    }

    const appIds = [...new Set(values.map((value) => String(value).trim()))];
    if (appIds.some((value) => !PACKAGE_ID_PATTERN.test(value))) {
        throw invalidInput('appIds contains an invalid Android package ID');
    }
    return appIds;
};

const boundedInteger = (value, fallback, minimum, maximum, name) => {
    const result = value === undefined ? fallback : Number(value);
    if (!Number.isInteger(result) || result < minimum || result > maximum) {
        throw invalidInput(`${name} must be an integer between ${minimum} and ${maximum}`);
    }
    return result;
};

export const normalizeInput = (input = {}) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw invalidInput('Actor input must be a JSON object');
    }

    const language = String(input.language ?? 'en')
        .trim()
        .toLowerCase();
    const country = String(input.country ?? 'US')
        .trim()
        .toUpperCase();
    if (!/^[a-z]{2,3}$/.test(language)) throw invalidInput('language must be a two- or three-letter code');
    if (!/^[A-Z]{2}$/.test(country)) throw invalidInput('country must be a two-letter ISO country code');

    const sort = input.sort ?? 'mostRelevant';
    if (!SORTS.has(sort)) throw invalidInput(`sort must be one of: ${[...SORTS].join(', ')}`);
    const analysisInput = input.analysis ?? {};
    if (typeof analysisInput !== 'object' || Array.isArray(analysisInput))
        throw invalidInput('analysis must be an object');
    if (analysisInput.enabled !== undefined && typeof analysisInput.enabled !== 'boolean') {
        throw invalidInput('analysis.enabled must be a boolean');
    }
    const analysisOutputLanguage = analysisInput.outputLanguage ?? 'english';
    if (!OUTPUT_LANGUAGES.has(analysisOutputLanguage)) {
        throw invalidInput(`analysis.outputLanguage must be one of: ${[...OUTPUT_LANGUAGES].join(', ')}`);
    }
    const aggregationInput = input.aggregation ?? {};
    if (typeof aggregationInput !== 'object' || Array.isArray(aggregationInput))
        throw invalidInput('aggregation must be an object');
    if (aggregationInput.enabled !== undefined && typeof aggregationInput.enabled !== 'boolean') {
        throw invalidInput('aggregation.enabled must be a boolean');
    }
    const comparisonInput = aggregationInput.comparison ?? {};
    if (typeof comparisonInput !== 'object' || Array.isArray(comparisonInput)) {
        throw invalidInput('aggregation.comparison must be an object');
    }
    if (comparisonInput.enabled !== undefined && typeof comparisonInput.enabled !== 'boolean') {
        throw invalidInput('aggregation.comparison.enabled must be a boolean');
    }
    const releasedAtValue = comparisonInput.releasedAt;
    const releasedAt =
        releasedAtValue === undefined || releasedAtValue === null || !String(releasedAtValue).trim()
            ? null
            : String(releasedAtValue).trim();
    if (releasedAt !== null && (!String(releasedAt).trim() || !Number.isFinite(Date.parse(releasedAt)))) {
        throw invalidInput('aggregation.comparison.releasedAt must be an ISO date-time');
    }

    return {
        appIds: normalizeAppIds(input),
        language,
        country,
        maxReviewsPerApp: boundedInteger(input.maxReviewsPerApp, 50, 1, 500, 'maxReviewsPerApp'),
        sort,
        useBrowserFallback: input.useBrowserFallback ?? false,
        requestTimeoutSecs: boundedInteger(input.requestTimeoutSecs, 30, 5, 120, 'requestTimeoutSecs'),
        analysis: {
            enabled: analysisInput.enabled ?? true,
            outputLanguage: analysisOutputLanguage,
            maxAttempts: boundedInteger(analysisInput.maxAttempts, 2, 1, 3, 'analysis.maxAttempts'),
        },
        aggregation: {
            enabled: aggregationInput.enabled ?? true,
            minimumClusterSize: boundedInteger(
                aggregationInput.minimumClusterSize,
                2,
                1,
                100,
                'aggregation.minimumClusterSize',
            ),
            comparison: {
                enabled: comparisonInput.enabled ?? false,
                releasedAt,
                daysBefore: boundedInteger(comparisonInput.daysBefore, 14, 1, 365, 'aggregation.comparison.daysBefore'),
                daysAfter: boundedInteger(comparisonInput.daysAfter, 14, 1, 365, 'aggregation.comparison.daysAfter'),
            },
        },
    };
};
