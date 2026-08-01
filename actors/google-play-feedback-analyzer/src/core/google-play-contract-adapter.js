import { validateNormalizedFeedback } from '@project/feedback-analysis-core';

const ENGLISH_MONTHS = new Map([
    ['january', 1],
    ['february', 2],
    ['march', 3],
    ['april', 4],
    ['may', 5],
    ['june', 6],
    ['july', 7],
    ['august', 8],
    ['september', 9],
    ['october', 10],
    ['november', 11],
    ['december', 12],
]);

const normalizeDateText = (value) => {
    if (!value) return null;
    const text = String(value).trim();
    const vietnamese = text.match(/^(\d{1,2})\s+tháng\s+(\d{1,2}),\s+(\d{4})$/i);
    if (vietnamese) {
        const [, day, month, year] = vietnamese;
        return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
    }

    const english = text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
    if (english) {
        const [, monthName, day, year] = english;
        const month = ENGLISH_MONTHS.get(monthName.toLowerCase());
        if (month) return new Date(Date.UTC(Number(year), month - 1, Number(day))).toISOString();
    }
    return null;
};

const normalizeRating = (rating) => {
    const value = Number(rating);
    return Number.isFinite(value) && value >= 0 ? value : null;
};

const positiveSignal = (rating) => {
    if (rating === null) return null;
    if (rating >= 4) return true;
    if (rating <= 2) return false;
    return null;
};

export const toNormalizedFeedback = ({ record, diagnostics = {} }) => {
    const source = record.source ?? {};
    const rating = normalizeRating(record.rating);
    const normalized = {
        source: {
            platform: 'google-play',
            sourceRecordId: String(record.reviewId),
            sourceUrl: diagnostics.url ?? null,
            collectedAt: diagnostics.collectedAt ?? '1970-01-01T00:00:00.000Z',
        },
        product: {
            productType: 'app',
            productId: String(record.appId),
            name: null,
            version: null,
        },
        feedback: {
            text: record.text ?? '',
            title: null,
            sourceLanguage: source.language ?? 'unknown',
            createdAt: normalizeDateText(record.reviewDateText),
            updatedAt: null,
            isPositive: positiveSignal(rating),
            rating,
        },
        environmentContext: {
            countryCode: source.country ?? null,
            appVersion: null,
            device: null,
            operatingSystem: null,
        },
        sourceMetadata: {
            helpfulCount: record.helpfulCount ?? null,
            developerReply: record.developerReply ?? null,
        },
    };
    return validateNormalizedFeedback(normalized);
};

export { normalizeDateText };
