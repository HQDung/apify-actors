import { Actor, log } from "apify";

import {
  buildAppStoreAggregation,
  reportKeyForProduct,
} from "./aggregation/app-store-aggregation.js";
import { analyzeAppStoreFeedback } from "./analysis/app-store-analysis.js";
import { normalizeInput } from "./app-store/normalize-input.js";
import { runAppStoreCollection } from "./app-store/run-collector.js";
import { toNormalizedFeedback } from "./core/app-store-contract-adapter.js";

await Actor.init();
const startedAt = Date.now();

try {
  const input = normalizeInput((await Actor.getInput()) ?? {});
  const result = await runAppStoreCollection({
    input,
    normalizeRecord: (record, diagnostics) =>
      toNormalizedFeedback({ record, diagnostics }),
    analyzeRecord: input.analysis.enabled
      ? (feedback) =>
          analyzeAppStoreFeedback({
            feedback,
            options: {
              outputLanguage: input.analysis.outputLanguage,
              maxAttempts: input.analysis.maxAttempts,
            },
          })
      : undefined,
    onRecord: (record) => Actor.pushData(record),
  });
  const aggregateRecords = buildAppStoreAggregation({
    coreRecords: result.coreRecords,
    aggregation: input.aggregation,
    releaseImpact: input.mode === "releaseImpact" ? input.release : null,
  });
  for (const record of aggregateRecords) await Actor.pushData(record);
  const reports = aggregateRecords.filter(
    (record) => record.recordType === "productFeedbackReport",
  );
  for (const report of reports)
    await Actor.setValue(reportKeyForProduct(report.product.productId), report);
  const finishedAt = Date.now();
  await Actor.setValue("RUN_STATS", {
    ...result.stats,
    collectionRecords: result.stats.totalRecords,
    totalRecords: result.stats.totalRecords + aggregateRecords.length,
    analysisRecords: result.coreRecords.filter((record) => record.analysis)
      .length,
    analysisFailures: result.coreRecords.filter(
      (record) => record.analysis?.analysisStatus !== "success",
    ).length,
    aggregationRecords: aggregateRecords.length,
    reportsStored: reports.length,
    memoryRssBytes: process.memoryUsage().rss,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    runtimeMs: finishedAt - startedAt,
  });
  log.info("Apple App Store collection completed", {
    appsProcessed: result.stats.appsProcessed,
    reviews: result.stats.reviewRecords,
    reports: reports.length,
  });
} catch (error) {
  log.error("Apple App Store collection failed", {
    code: error.code ?? "APP_STORE_ACTOR_ERROR",
    message: error.message,
  });
  throw error;
} finally {
  await Actor.exit();
}
