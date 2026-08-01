import assert from "node:assert/strict";
import { test } from "node:test";

import { createInitialRunStats } from "../src/runtime/run-stats.js";

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
