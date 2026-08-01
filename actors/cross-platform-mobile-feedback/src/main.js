import { Actor, log } from "apify";

import { normalizeInput } from "./input/normalize-input.js";
import { createInitialRunStats } from "./runtime/run-stats.js";

await Actor.init();
const startedAt = Date.now();

try {
  const input = normalizeInput((await Actor.getInput()) ?? {});
  const finishedAt = Date.now();
  await Actor.setValue("RUN_STATS", {
    ...createInitialRunStats({ productCount: input.products.length }),
    phase: "skeleton",
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    runtimeMs: finishedAt - startedAt,
    note: "Product mapping validated; source collection and comparison are implemented in later phases.",
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
