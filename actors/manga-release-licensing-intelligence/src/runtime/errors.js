export const ERROR_CODES = Object.freeze([
    'INVALID_INPUT',
    'UNSUPPORTED_MODE',
    'UNSUPPORTED_MARKET',
    'INVALID_TITLE',
    'TITLE_NOT_FOUND',
    'AMBIGUOUS_TITLE',
    'METADATA_SOURCE_FAILED',
    'METADATA_FALLBACK_FAILED',
    'PUBLISHER_SOURCE_FAILED',
    'OFFICIAL_AVAILABILITY_FAILED',
    'RETAILER_SOURCE_FAILED',
    'EDITION_MATCH_FAILED',
    'INVALID_ISBN',
    'CHANGE_DATASET_UNAVAILABLE',
    'CHANGE_COMPARISON_FAILED',
    'RATE_LIMITED',
    'REQUEST_TIMEOUT',
    'RUN_DEADLINE_REACHED',
    'UNEXPECTED_ERROR',
    'SOURCE_CIRCUIT_OPEN',
]);

export class MangaActorError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'MangaActorError';
        this.code = code;
        Object.assign(this, details);
    }
}

export const createActorError = (code, message, details = {}) =>
    new MangaActorError(code, message, details);

export const sourceFailureCode = (error, fallbackCode) =>
    ['RATE_LIMITED', 'REQUEST_TIMEOUT', 'RUN_DEADLINE_REACHED', 'SOURCE_CIRCUIT_OPEN'].includes(error?.code)
        ? error.code
        : fallbackCode;
