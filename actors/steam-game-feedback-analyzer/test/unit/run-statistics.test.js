import { describe, expect, it } from "vitest";

import { createRunStatistics } from "../../src/runtime/run-statistics.js";

describe("raw run statistics", () => {
  it("starts counters at zero and reports runtime", () => {
    const statistics = createRunStatistics({ now: () => 1_000 });
    statistics.increment("gamesRequested");
    statistics.increment("reviewsCollected", 3);
    expect(statistics.summary({ finishedAt: 2_500 })).toMatchObject({
      gamesRequested: 1,
      reviewsCollected: 3,
      reviewsPushed: 0,
      errors: 0,
      runtimeSeconds: 1.5,
    });
  });

  it("returns an independent JSON-safe summary", () => {
    const statistics = createRunStatistics({ now: () => 0 });
    const summary = statistics.summary({ finishedAt: 0 });
    summary.reviewsCollected = 99;
    expect(statistics.summary({ finishedAt: 0 }).reviewsCollected).toBe(0);
    expect(() => JSON.stringify(summary)).not.toThrow();
  });
});
