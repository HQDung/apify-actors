import { Actor, log } from 'apify';

import { createGameMetadataAdapter } from './adapters/game-metadata.js';
import { createSteamNewsAdapter } from './adapters/steam-news.js';
import { createSteamReviewsAdapter } from './adapters/steam-reviews.js';
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
    for (const appId of input.steamAppIds) {
        log.info(`Analyzing Steam App ${appId}.`);
        try {
            const result = await runGame({
                appId,
                input,
                metadataAdapter,
                newsAdapter,
                reviewsAdapter,
                pushData: (value) => Actor.pushData(value),
                setValue: (key, value) => Actor.setValue(key, value),
            });
            stats.reviewPagesFetched += result.stats.pagesFetched;
            stats.reviewsScanned += result.stats.reviewsScanned;
            stats.reviewsAnalyzed += result.stats.reviewsAnalyzed;
            if (result.status === 'failed') {
                stats.gamesFailed += 1;
                stats.errors += 1;
                log.warning(`Steam App ${appId} failed: ${result.errorMessage ?? result.errorCode}.`);
            } else {
                stats.gamesProcessed += 1;
                log.info(
                    `App ${appId}: ${result.periods.before.reviews.length} before / ${result.periods.after.reviews.length} after samples.`,
                );
                log.info(
                    `Coverage: ${result.periods.before.coverage.coverageStatus}/${result.periods.after.coverage.coverageStatus}.`,
                );
            }
        } catch (error) {
            stats.gamesFailed += 1;
            stats.errors += 1;
            log.warning(`Steam App ${appId} failed: ${error.message}.`);
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
