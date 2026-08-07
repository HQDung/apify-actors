import { resolveComparisonBoundary } from '../domain/patch-detector.js';
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
    newsAdapter,
}) => {
    let comparison = resolveComparisonBoundary({ input, newsItems: [] });
    let newsItemsFetched = 0;
    if (input.comparisonMode === 'latest_patch') {
        try {
            const newsItems = await newsAdapter.fetchGameNews(appId);
            newsItemsFetched = newsItems.length;
            comparison = resolveComparisonBoundary({ input, newsItems });
        } catch {
            comparison = resolveComparisonBoundary({ input, newsItems: [] });
            comparison.warnings = ['NEWS_ENDPOINT_UNAVAILABLE', ...comparison.warnings];
        }
    }
    const result = await collect({
        appId,
        input,
        now,
        patchBoundary: comparison.patchBoundary,
        metadataAdapter,
        reviewsAdapter,
    });
    result.requestedComparisonMode = input.comparisonMode;
    result.effectiveComparisonMode = comparison.effectiveComparisonMode;
    result.patch = comparison.patch;
    result.warnings = [...new Set([...comparison.warnings, ...result.warnings])];
    result.stats = { ...result.stats, newsItemsFetched };
    await setValue(`GAME_${appId}_COLLECTION`, result);
    await pushData({
        status: result.status === 'failed' ? 'failed' : 'collection_only',
        steamAppId: result.game.steamAppId,
        gameName: result.game.gameName,
        storeUrl: result.game.storeUrl,
        requestedComparisonMode: result.requestedComparisonMode,
        effectiveComparisonMode: result.effectiveComparisonMode,
        patch: result.patch,
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
