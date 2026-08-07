import { resolveComparisonBoundary } from '../domain/patch-detector.js';
import { analyzeGameImpact } from '../services/analyze-game-impact.js';
import { collectGameFeedback } from '../services/collect-game-feedback.js';

export const runGame = async ({
    appId,
    input,
    now,
    collect = collectGameFeedback,
    pushData,
    metadataAdapter,
    reviewsAdapter,
    newsAdapter,
}) => {
    const startedAt = Date.now();
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
    const report = await analyzeGameImpact({
        collection: result,
        input,
        effectiveComparisonMode: comparison.effectiveComparisonMode,
        patch: comparison.patch,
        generatedAt: now ?? new Date().toISOString(),
    });
    report.stats = { ...report.stats, newsItemsFetched, durationMs: Date.now() - startedAt };
    await pushData(report);
    return report;
};
