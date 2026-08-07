import { analyzeFeedback, validateNormalizedFeedback } from '@project/feedback-analysis-core';

import { fallbackAnalyzeGameFeedback, GAME_TAXONOMY } from '../domain/game-taxonomy.js';

const sourceUrlFor = (record) => `https://steamcommunity.com/app/${encodeURIComponent(String(record.appId))}/reviews/`;

export const toNormalizedFeedback = (record) => {
    const normalized = {
        source: {
            platform: 'steam',
            sourceRecordId: String(record.id),
            sourceUrl: sourceUrlFor(record),
            collectedAt: record.updatedAt ?? record.createdAt ?? new Date().toISOString(),
        },
        product: {
            productType: 'game',
            productId: String(record.appId),
            name: null,
            version: null,
        },
        feedback: {
            text: String(record.text ?? ''),
            title: null,
            sourceLanguage: String(record.language ?? 'unknown'),
            createdAt: record.createdAt ?? null,
            updatedAt: record.updatedAt ?? null,
            isPositive: record.positive ?? null,
            rating: Number.isFinite(record.rating) ? record.rating : null,
        },
        environmentContext: {
            playtimeMinutes: record.playtimeMinutes ?? null,
            playtimeAtReviewMinutes: record.playtimeAtReviewMinutes ?? null,
            writtenDuringEarlyAccess: record.writtenDuringEarlyAccess ?? null,
        },
        sourceMetadata: {
            helpfulVotes: record.helpfulVotes ?? 0,
            funnyVotes: record.funnyVotes ?? 0,
            commentCount: record.commentCount ?? 0,
            steamPurchase: record.steamPurchase ?? null,
            receivedForFree: record.receivedForFree ?? null,
            developerResponse: record.developerResponse ?? null,
        },
    };
    return validateNormalizedFeedback(normalized);
};

export const analyzeGameFeedback = (record) => {
    const feedback = toNormalizedFeedback(record);
    return analyzeFeedback({
        feedback,
        taxonomy: GAME_TAXONOMY,
        options: { outputLanguage: 'english' },
        fallback: fallbackAnalyzeGameFeedback,
    });
};

export { GAME_TAXONOMY };
