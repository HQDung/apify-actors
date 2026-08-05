import { cloneDefaultInput } from '../config/defaults.js';
import { isSupportedMarket, marketCodeFor } from '../config/supported-markets.js';
import { uniqueTitles } from '../identity/normalize-title.js';

const invalid = (message, details = {}) => {
    const error = new Error(message);
    error.code = 'INVALID_INPUT';
    Object.assign(error, details);
    return error;
};

const asBoundedInteger = (value, fallback, minimum, maximum, field) => {
    const candidate = value ?? fallback;
    if (!Number.isInteger(candidate) || candidate < minimum || candidate > maximum) {
        throw invalid(`${field} must be an integer between ${minimum} and ${maximum}.`, { field });
    }
    return candidate;
};

const normalizeMarket = (market) => {
    if (!market || typeof market !== 'object') throw invalid('Each market must be an object.');
    const countryCode = String(market.countryCode ?? '').toUpperCase();
    const languageCode = String(market.languageCode ?? '').toLowerCase();
    if (!/^[A-Z]{2}$/.test(countryCode) || !/^[a-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(languageCode)) {
        throw invalid('Each market requires ISO countryCode and languageCode values.');
    }
    const normalized = { countryCode, languageCode };
    if (!isSupportedMarket(normalized)) {
        throw invalid(`Unsupported market ${marketCodeFor(normalized)}. Supported markets: US-en, VN-vi.`);
    }
    return normalized;
};

export const normalizeInput = (rawInput) => {
    const raw = rawInput && typeof rawInput === 'object' ? rawInput : {};
    const defaults = cloneDefaultInput();
    const input = {
        ...defaults,
        ...raw,
        proxyConfiguration: {
            ...defaults.proxyConfiguration,
            ...(raw.proxyConfiguration ?? {}),
        },
    };

    if (!['titleLookup', 'publisherCalendar', 'availabilityMonitor'].includes(input.mode)) {
        throw invalid(`Unsupported mode: ${input.mode}.`, { field: 'mode' });
    }
    if (!['en', 'original'].includes(input.normalizedOutputLanguage)) {
        throw invalid('normalizedOutputLanguage must be en or original.', {
            field: 'normalizedOutputLanguage',
        });
    }
    input.maxTitles = asBoundedInteger(input.maxTitles, 1, 1, 100, 'maxTitles');
    input.maxEditionsPerTitle = asBoundedInteger(
        input.maxEditionsPerTitle,
        3,
        1,
        50,
        'maxEditionsPerTitle',
    );
    input.maxOffersPerEdition = asBoundedInteger(
        input.maxOffersPerEdition,
        2,
        0,
        20,
        'maxOffersPerEdition',
    );
    input.requestTimeoutSecs = asBoundedInteger(
        input.requestTimeoutSecs,
        25,
        10,
        90,
        'requestTimeoutSecs',
    );
    input.maxConcurrency = asBoundedInteger(input.maxConcurrency, 2, 1, 10, 'maxConcurrency');

    const titles = uniqueTitles(Array.isArray(input.titles) ? input.titles : []);
    if (titles.some((title) => title.length > 200)) throw invalid('Titles must be 200 characters or fewer.');
    input.titles = titles.slice(0, input.maxTitles);
    input.markets = (Array.isArray(input.markets) ? input.markets : defaults.markets).map(normalizeMarket);
    input.publisherUrls = Array.isArray(input.publisherUrls) ? input.publisherUrls.filter(Boolean) : [];
    input.editionUrls = Array.isArray(input.editionUrls) ? input.editionUrls.filter(Boolean) : [];
    input.previousDatasetId = typeof input.previousDatasetId === 'string' ? input.previousDatasetId : '';
    input.proxyConfiguration = { useApifyProxy: input.proxyConfiguration.useApifyProxy === true };

    if (input.mode === 'titleLookup' && !input.titles.length && !input.editionUrls.length && !input.previousDatasetId) {
        throw invalid('titleLookup requires at least one title, edition URL, or previous dataset.');
    }
    if (input.detectChanges && !input.previousDatasetId) {
        throw invalid('previousDatasetId is required when detectChanges is enabled.', {
            field: 'previousDatasetId',
        });
    }
    return input;
};

export { invalid as inputError };
