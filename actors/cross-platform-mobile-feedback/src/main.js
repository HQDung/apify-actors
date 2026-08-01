import { Actor, log } from "apify";

import { collectMappedProductReviews } from "./collection/collect-products.js";
import { normalizeInput } from "./input/normalize-input.js";
import { createInitialRunStats } from "./runtime/run-stats.js";

await Actor.init();
const startedAt = Date.now();

try {
  const input = normalizeInput((await Actor.getInput()) ?? {});
  const collection = await collectMappedProductReviews({ input });
  for (const review of collection.reviews) await Actor.pushData(review);
  for (const diagnostic of collection.diagnostics) {
    await Actor.pushData({ recordType: "sourceDiagnostic", ...diagnostic });
  }
  for (const entry of collection.errors) {
    await Actor.pushData({
      recordType: "runError",
      productId: entry.productId,
      platform: entry.platform,
      appId: entry.appId,
      ...entry.error,
      generatedAt: new Date().toISOString(),
    });
  }
  const finishedAt = Date.now();
  await Actor.setValue("RUN_STATS", {
    ...createInitialRunStats({ productCount: input.products.length }),
    ...collection.stats,
    phase: "collection",
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    runtimeMs: finishedAt - startedAt,
    note: "Raw Google Play and Apple App Store collection completed with platform-scoped diagnostics.",
  });
  await Actor.setValue("NORMALIZED_INPUT", input);
  log.info("Cross-platform input mapping validated", {
    products: input.products.length,
    mode: input.mode,
  });
} catch (error) {
  await Actor.setValue("RUN_ERROR", {
    recordType: "runError",
    code: error.code ?? "UNEXPECTED_ERROR",
    message: error.message,
    generatedAt: new Date().toISOString(),
  });
  log.error("Cross-platform input validation failed", {
    code: error.code ?? "UNEXPECTED_ERROR",
    message: error.message,
  });
  throw error;
} finally {
  await Actor.exit();
}
