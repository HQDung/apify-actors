import { Actor, log } from "apify";

import { analyzeCollectedReviews } from "./analysis/cross-platform-analysis.js";
import { createOpenAiProvider } from "./analysis/openai-provider.js";
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
  const reviewsForAnalysis = input.analysis.enabled
    ? collection.reviews.slice(0, input.analysis.maxReviewsToAnalyze)
    : [];
  const provider = createOpenAiProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
  });
  const analysis = await analyzeCollectedReviews({
    reviews: reviewsForAnalysis,
    provider,
    options: {
      outputLanguage: input.analysis.outputLanguage,
      maxAttempts: input.analysis.maxAttempts,
    },
    logger: log,
    cacheMaxEntries: input.analysis.cacheMaxEntries,
  });
  for (const entry of analysis.analysisRecords) {
    await Actor.pushData({
      recordType: "reviewAnalysis",
      product: entry.review.product,
      platform: entry.review.platform,
      review: entry.review.review,
      normalizedFeedback: entry.normalizedFeedback,
      analysis: entry.analysis,
      cacheHit: entry.cacheHit,
    });
  }
  const finishedAt = Date.now();
  await Actor.setValue("RUN_STATS", {
    ...createInitialRunStats({ productCount: input.products.length }),
    ...collection.stats,
    reviewsAnalyzed: analysis.analysisRecords.length,
    analysisFailures: analysis.analysisRecords.filter(
      (entry) => entry.analysis.analysisStatus === "failed",
    ).length,
    analysisSkipped: collection.reviews.length - reviewsForAnalysis.length,
    analysisProvider: provider ? "openai-compatible" : "deterministic-fallback",
    analysisUsage: analysis.usage,
    phase: "analysis",
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    runtimeMs: finishedAt - startedAt,
    note: "Raw collection and per-review analysis completed; platform clustering and comparison are later phases.",
  });
  await Actor.setValue("NORMALIZED_INPUT", input);
  log.info("Cross-platform collection and analysis completed", {
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
