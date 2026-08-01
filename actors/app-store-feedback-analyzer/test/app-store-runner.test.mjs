import assert from "node:assert/strict";
import { test } from "node:test";

import { runAppStoreCollection } from "../src/app-store/run-collector.js";

test("keeps successful Apple apps when another app returns a source error", async () => {
  const published = [];
  const result = await runAppStoreCollection({
    input: { appIds: ["123456789", "987654321"], maxReviewsPerApp: 2 },
    collect: async ({ appId }) =>
      appId === "123456789"
        ? {
            records: [
              {
                reviewId: "review-1",
                appId,
                rating: 5,
                text: "Good",
                source: { country: "US", language: "en" },
              },
            ],
            diagnostics: { httpStatus: 200, collectionMode: "rss-json" },
          }
        : {
            records: [],
            diagnostics: { httpStatus: 404, collectionMode: "rss-json" },
            error: { code: "APP_STORE_HTTP_ERROR", httpStatus: 404 },
          },
    onRecord: async (record) => published.push(record),
  });

  assert.equal(
    published.filter((record) => record.recordType === "review").length,
    1,
  );
  assert.equal(
    published.filter((record) => record.recordType === "sourceDiagnostic")
      .length,
    2,
  );
  assert.equal(result.stats.appsProcessed, 2);
  assert.equal(result.stats.errors, 1);
});

test("attaches normalized feedback and shared analysis to review output", async () => {
  const published = [];
  await runAppStoreCollection({
    input: { appIds: ["123456789"] },
    collect: async () => ({
      records: [
        { reviewId: "review-1", appId: "123456789", rating: 2, text: "Issue" },
      ],
      diagnostics: { httpStatus: 200, collectionMode: "rss-json" },
    }),
    normalizeRecord: (record) => ({
      source: { sourceRecordId: record.reviewId },
    }),
    analyzeRecord: async (normalized) => ({
      analysisStatus:
        normalized.source.sourceRecordId === "review-1" ? "success" : "failed",
    }),
    onRecord: async (record) => published.push(record),
  });

  assert.equal(
    published[0].normalizedFeedback.source.sourceRecordId,
    "review-1",
  );
  assert.equal(published[0].analysis.analysisStatus, "success");
});
