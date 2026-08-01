import assert from "node:assert/strict";
import { test } from "node:test";

import { runQualityBenchmark } from "../benchmark/quality-benchmark.mjs";

test("meets the cross-platform quality benchmark on the reproducible fixture", async () => {
  const result = await runQualityBenchmark();

  assert.equal(result.dataset.androidReviews, 50);
  assert.equal(result.dataset.iosReviews, 50);
  assert.equal(result.analysis.schemaValidity, 1);
  assert.equal(result.clustering.coherence, 1);
  assert.ok(result.comparison.sharedPrecision >= 0.85);
  assert.ok(result.comparison.sharedRecall >= 0.85);
  assert.ok(result.comparison.platformSpecificFalsePositiveRate <= 0.1);
  assert.equal(result.dimensions.ratingDifference, -2);
  assert.equal(result.dimensions.countryAccuracy, 1);
  assert.equal(result.dimensions.languageAccuracy, 1);
  assert.equal(result.release.beforeAfterWindowAccuracy, 1);
  assert.equal(result.operational.crossProductMatches, 0);
  assert.ok(result.operational.runtimeMs >= 0);
  assert.ok(result.operational.peakRssMb > 0);
  assert.ok(result.cost.estimatedProviderCost > 0);
});
