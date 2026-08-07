import { collectGameFeedback } from '../services/collect-game-feedback.js';

export const runGame = async ({
    appId,
    input,
    now,
    collect = collectGameFeedback,
    pushData,
    setValue,
    metadataAdapter,
    reviewsAdapter,
}) => {
    const result = await collect({ appId, input, now, metadataAdapter, reviewsAdapter });
    await setValue(`GAME_${appId}_COLLECTION`, result);
    await pushData({
        status: result.status === 'failed' ? 'failed' : 'collection_only',
        steamAppId: result.game.steamAppId,
        gameName: result.game.gameName,
        storeUrl: result.game.storeUrl,
        comparison: {
            boundaryAt: result.windows.boundaryAt,
            windowDays: input.windowDays,
            before: { reviewsAnalyzed: result.periods.before.reviews.length },
            after: { reviewsAnalyzed: result.periods.after.reviews.length },
        },
        coverage: result.periods,
        warnings: result.warnings,
        stats: result.stats,
    });
    return result;
};
