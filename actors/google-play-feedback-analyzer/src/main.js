import { Actor, log } from 'apify';

import { buildGooglePlayAggregation, reportKeyForProduct } from './aggregation/google-play-aggregation.js';
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
    const aggregateRecords = buildGooglePlayAggregation({
        coreRecords: result.coreRecords,
        aggregation: input.aggregation,
    });
    for (const record of aggregateRecords) await Actor.pushData(record);
    const productReports = aggregateRecords.filter((record) => record.recordType === 'productFeedbackReport');
    for (const report of productReports) {
        await Actor.setValue(reportKeyForProduct(report.product.productId), report);
    }
    const finishedAt = Date.now();
    const runStatistics = {
        ...result.stats,
        collectionRecords: result.stats.totalRecords,
        totalRecords: result.stats.totalRecords + aggregateRecords.length,
        aggregationRecords: aggregateRecords.length,
        reportsStored: productReports.length,
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
