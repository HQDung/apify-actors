import { Actor, log } from 'apify';

import { analyzeGooglePlayFeedback } from './analysis/google-play-analysis.js';
import { toNormalizedFeedback } from './core/google-play-contract-adapter.js';
import { normalizeInput } from './google-play/normalize-input.js';
import { runGooglePlayCollection } from './google-play/run-collector.js';

await Actor.init();
const startedAt = Date.now();

try {
    const input = normalizeInput((await Actor.getInput()) ?? {});
    const result = await runGooglePlayCollection({
        input,
        normalizeRecord: (record, diagnostics) => toNormalizedFeedback({ record, diagnostics }),
        analyzeRecord: input.analysis.enabled
            ? (feedback) =>
                  analyzeGooglePlayFeedback({
                      feedback,
                      options: {
                          outputLanguage: input.analysis.outputLanguage,
                          maxAttempts: input.analysis.maxAttempts,
                      },
                  })
            : undefined,
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
