import assert from "node:assert/strict";
import { test } from "node:test";

import { createInitialRunStats } from "../src/runtime/run-stats.js";
import { validateRunStats } from "../src/runtime/validate-output.js";

test("creates zero-collection run statistics for the skeleton Actor", () => {
  assert.deepEqual(createInitialRunStats({ productCount: 2 }), {
    productsRequested: 2,
    productsProcessed: 0,
    googlePlayReviewsCollected: 0,
    appleAppStoreReviewsCollected: 0,
    reviewsAnalyzed: 0,
    platformClustersCreated: 0,
    crossPlatformComparisonsCreated: 0,
    errors: 0,
  });
});

test("validates runtime statistics and rejects malformed output", () => {
  const stats = validateRunStats({
    ...createInitialRunStats({ productCount: 1 }),
    googlePlayRequests: 1,
    appleAppStoreRequests: 1,
    phase: "reporting",
  });
  assert.equal(stats.phase, "reporting");
  assert.throws(
    () => validateRunStats({ ...stats, errors: -1 }),
    /INVALID_ACTOR_OUTPUT/,
  );
});
