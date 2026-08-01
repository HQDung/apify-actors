import { describe, expect, it } from "vitest";

import {
  buildPatchWindows,
  comparePatchImpact,
} from "../../src/aggregation/patch-impact.js";
import { normalizeInput } from "../../src/input/normalize-input.js";

const record = ({ id, createdAt, topics, title = null, recommended = false }) => ({
  recordType: "review",
  game: { steamAppId: 730, name: "Counter-Strike 2" },
  review: { reviewId: id, createdAt, language: "english", recommended },
  analysisStatus: "success",
  analysis: {
    isActionableFeedback: true,
    actionabilityScore: 0.8,
    primaryFeedbackType: "bugReport",
    feedbackTypes: ["bugReport"],
    sentiment: "negative",
    severity: "high",
    topics,
    summary: title ?? "reported issue",
    issue: title ? { title, triggerSignals: [] } : null,
    featureRequest: null,
  },
});

describe("patch impact mode", () => {
  it("validates patch input and normalizes its bounded settings", () => {
    expect(
      normalizeInput({
        mode: "patchImpact",
        steamAppIds: [730],
        patch: { releasedAt: "2026-07-20T00:00:00.000Z", version: "1.4" },
        daysBefore: 14,
        daysAfter: 14,
        maxReviewsPerPeriod: 100,
      }),
    ).toMatchObject({
      mode: "patchImpact",
      patch: { releasedAt: "2026-07-20T00:00:00.000Z", version: "1.4", notesUrl: null },
      daysBefore: 14,
      daysAfter: 14,
      maxReviewsPerPeriod: 100,
    });
    expect(() => normalizeInput({ mode: "patchImpact", steamAppIds: [730] })).toThrow(/patch.releasedAt/i);
  });

  it("builds non-overlapping inclusive before and after windows", () => {
    expect(buildPatchWindows({ releasedAt: "2026-07-20T00:00:00.000Z", daysBefore: 2, daysAfter: 3 })).toEqual({
      before: { from: "2026-07-18T00:00:00.000Z", to: "2026-07-19T23:59:59.999Z", recentDays: null },
      after: { from: "2026-07-20T00:00:00.000Z", to: "2026-07-22T23:59:59.999Z", recentDays: null },
    });
  });

  it("reports topic deltas, new issues, improved topics, and possible regressions without causal claims", () => {
    const report = comparePatchImpact({
      game: { steamAppId: 730, name: "Counter-Strike 2" },
      patch: { releasedAt: "2026-07-20T00:00:00.000Z", version: "1.4", notesUrl: null },
      beforeRecords: [record({ id: "b1", createdAt: "2026-07-19T10:00:00.000Z", topics: ["crashes", "inventory"], title: "Crash when opening inventory" }), record({ id: "b2", createdAt: "2026-07-19T11:00:00.000Z", topics: ["stuttering"] })],
      afterRecords: [record({ id: "a1", createdAt: "2026-07-20T10:00:00.000Z", topics: ["crashes", "inventory"], title: "Crash when opening inventory" }), record({ id: "a2", createdAt: "2026-07-21T10:00:00.000Z", topics: ["servers"], title: "Servers unavailable" }), record({ id: "a3", createdAt: "2026-07-22T10:00:00.000Z", topics: ["crashes", "inventory"], title: "Crash when opening inventory" })],
      generatedAt: "2026-07-31T08:00:00.000Z",
    });

    expect(report).toMatchObject({
      recordType: "patchImpactReport",
      statistics: { beforeReviews: 2, afterReviews: 3 },
      newIssues: [{ title: "Servers unavailable", mentionCount: 1 }],
      improvedTopics: [{ topic: "stuttering", change: -1 }],
      generatedAt: "2026-07-31T08:00:00.000Z",
    });
    expect(report.possibleRegressions).toEqual(expect.arrayContaining([expect.objectContaining({ topic: "crashes", change: 1 })]));
    expect(report.disclaimer).toMatch(/not a causal confirmation/i);
  });
});
