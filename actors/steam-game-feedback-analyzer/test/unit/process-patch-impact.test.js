import { describe, expect, it } from "vitest";

import { processPatchImpactGame } from "../../src/runtime/process-patch-impact.js";
import { createRunStatistics } from "../../src/runtime/run-statistics.js";

describe("patch impact game processing", () => {
  it("collects separate bounded windows and returns one comparison report", async () => {
    const windows = [];
    const statistics = createRunStatistics({ now: () => 0 });
    const result = await processPatchImpactGame({
      appId: "730",
      input: {
        languages: ["english"],
        reviewFilter: "all",
        purchaseType: "all",
        patch: { releasedAt: "2026-07-20T00:00:00.000Z", version: "1.4", notesUrl: null },
        daysBefore: 2,
        daysAfter: 2,
        maxReviewsPerPeriod: 2,
        includeReviewText: true,
        analysis: { enabled: true, clusterSimilarIssues: false },
        aggregation: { enabled: false },
      },
      client: {
        getGameDetails: async () => ({ steamAppId: 730, name: "Counter-Strike 2" }),
        fetchReviews: async (options) => {
          windows.push(options.dateRange);
          return [];
        },
      },
      statistics,
      pushData: async () => {},
      generatedAt: "2026-07-31T08:00:00.000Z",
    });

    expect(windows).toHaveLength(2);
    expect(windows[0].to).toBe("2026-07-19T23:59:59.999Z");
    expect(windows[1].from).toBe("2026-07-20T00:00:00.000Z");
    expect(result.report).toMatchObject({
      recordType: "patchImpactReport",
      statistics: { beforeReviews: 0, afterReviews: 0 },
    });
  });
});
