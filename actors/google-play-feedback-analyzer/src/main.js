import { Actor, log } from 'apify';

import { runGooglePlayCollection } from './google-play/run-collector.js';

await Actor.init();
const startedAt = Date.now();

try {
    const result = await runGooglePlayCollection({
        input: (await Actor.getInput()) ?? {},
        onRecord: (record) => Actor.pushData(record),
    });
    const finishedAt = Date.now();
    const runStatistics = {
        ...result.stats,
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        runtimeMs: finishedAt - startedAt,
    };
    await Actor.setValue('RUN_STATS', runStatistics);
    log.info('Google Play collection completed', runStatistics);
} catch (error) {
    log.error('Google Play collection failed', {
        code: error.code ?? 'GOOGLE_PLAY_ACTOR_ERROR',
        message: error.message,
    });
    throw error;
} finally {
    await Actor.exit();
}
