import { Actor, log } from 'apify';

import { createGameMetadataAdapter } from './adapters/game-metadata.js';
import { createSteamNewsAdapter } from './adapters/steam-news.js';
import { createSteamReviewsAdapter } from './adapters/steam-reviews.js';
import { MAX_CONCURRENT_GAMES } from './config.js';
import { normalizeInput } from './input/normalize-input.js';
import { runGame } from './runtime/run-game.js';

await Actor.init();

const startedAt = Date.now();
const stats = {
    gamesRequested: 0,
    gamesProcessed: 0,
    gamesFailed: 0,
    reviewPagesFetched: 0,
    reviewsScanned: 0,
    reviewsAnalyzed: 0,
    errors: 0,
};
let exitCode = 0;
let statusMessage;

try {
    const input = normalizeInput((await Actor.getInput()) ?? {});
    const metadataAdapter = createGameMetadataAdapter();
    const newsAdapter = createSteamNewsAdapter();
    const reviewsAdapter = createSteamReviewsAdapter();
    stats.gamesRequested = input.steamAppIds.length;
    for (let offset = 0; offset < input.steamAppIds.length; offset += MAX_CONCURRENT_GAMES) {
        const appIds = input.steamAppIds.slice(offset, offset + MAX_CONCURRENT_GAMES);
        const results = await Promise.all(
            appIds.map(async (appId) => {
                log.info(`Analyzing Steam App ${appId}.`);
                try {
                    return await runGame({
                        appId,
                        input,
                        metadataAdapter,
                        newsAdapter,
                        reviewsAdapter,
                        pushData: (value) => Actor.pushData(value),
                    });
                } catch (error) {
                    const failed = {
                        status: 'failed',
                        steamAppId: appId,
                        gameName: null,
                        storeUrl: `https://store.steampowered.com/app/${encodeURIComponent(appId)}/`,
                        requestedComparisonMode: input.comparisonMode,
                        effectiveComparisonMode: input.comparisonMode,
                        generatedAt: new Date().toISOString(),
                        warnings: ['GAME_RUN_FAILED'],
                        errorCode: 'GAME_RUN_FAILED',
                        errorMessage: error.message.slice(0, 240),
                        stats: {
                            reviewsScanned: 0,
                            reviewsAnalyzed: 0,
                            reviewPagesFetched: 0,
                            newsItemsFetched: 0,
                            durationMs: 0,
                        },
                    };
                    await Actor.pushData(failed);
                    log.warning(`Steam App ${appId} failed: ${error.message}.`);
                    return failed;
                }
            }),
        );
        for (const result of results) {
            stats.reviewPagesFetched += result.stats.reviewPagesFetched ?? result.stats.pagesFetched ?? 0;
            stats.reviewsScanned += result.stats.reviewsScanned ?? 0;
            stats.reviewsAnalyzed += result.stats.reviewsAnalyzed ?? 0;
            if (result.status === 'failed') {
                stats.gamesFailed += 1;
                stats.errors += 1;
                log.warning(`Steam App ${result.steamAppId} failed: ${result.errorMessage ?? result.errorCode}.`);
            } else {
                stats.gamesProcessed += 1;
                log.info(
                    `App ${result.steamAppId}: ${result.comparison.before.reviewsAnalyzed} before / ${result.comparison.after.reviewsAnalyzed} after samples.`,
                );
                log.info(`Coverage: ${result.coverage.before.coverageStatus}/${result.coverage.after.coverageStatus}.`);
            }
        }
    }
} catch (error) {
    exitCode = 1;
    stats.errors += 1;
    statusMessage = `Game patch impact collection failed: ${error.message}`;
    log.exception(error, statusMessage);
} finally {
    await Actor.setValue('RUN_STATS', { ...stats, durationMs: Date.now() - startedAt });
    await Actor.exit({ exitCode, statusMessage });
}
