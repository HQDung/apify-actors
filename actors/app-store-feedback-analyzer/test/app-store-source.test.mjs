import assert from "node:assert/strict";
import { test } from "node:test";

import { collectAppStoreReviews } from "../src/app-store/collect-reviews.js";
import {
  normalizeInput,
  parseAppStoreUrl,
} from "../src/app-store/normalize-input.js";
import { parseAppStoreReviews } from "../src/app-store/parse-rss-json.js";

const feed = (entries) => JSON.stringify({ feed: { entry: entries } });
const reviewEntry = ({
  id,
  rating = 4,
  title = "Stable app",
  body = "Works well.",
  date = "2026-07-30T08:00:00-07:00",
  version = "4.2.0",
}) => ({
  id: { label: `https://itunes.apple.com/us/review?id=${id}` },
  title: { label: title },
  content: { label: body },
  updated: { label: date },
  "im:rating": { label: String(rating) },
  "im:version": { label: version },
  "im:voteSum": { label: "7" },
  link: { attributes: { href: `https://itunes.apple.com/us/review?id=${id}` } },
});

test("parses App Store RSS JSON review entries without reviewer identity", () => {
  const reviews = parseAppStoreReviews(
    feed([reviewEntry({ id: "review-1" })]),
    {
      appId: "123456789",
      country: "US",
      language: "en",
    },
  );

  assert.deepEqual(reviews, [
    {
      reviewId: "review-1",
      appId: "123456789",
      rating: 4,
      title: "Stable app",
      text: "Works well.",
      reviewDateText: "2026-07-30T08:00:00-07:00",
      appVersion: "4.2.0",
      helpfulCount: 7,
      developerReply: null,
      source: { country: "US", language: "en" },
    },
  ]);
});

test("normalizes Apple IDs and App Store URLs deterministically", () => {
  assert.equal(
    parseAppStoreUrl("https://apps.apple.com/us/app/example/id123456789"),
    "123456789",
  );
  assert.deepEqual(
    normalizeInput({
      appIds: ["123456789"],
      appStoreUrls: ["https://apps.apple.com/vn/app/example/id987654321"],
      country: "vn",
      language: "vi",
      maxReviewsPerApp: 12,
      maxPagesPerApp: 2,
    }),
    {
      appIds: ["123456789", "987654321"],
      country: "VN",
      language: "vi",
      maxReviewsPerApp: 12,
      maxPagesPerApp: 2,
      requestTimeoutSecs: 30,
      debug: false,
      analysis: { enabled: true, outputLanguage: "english", maxAttempts: 2 },
      aggregation: { enabled: true, minimumClusterSize: 2 },
    },
  );
});

test("normalizes release-impact settings with a required release timestamp", () => {
  assert.deepEqual(
    normalizeInput({
      mode: "releaseImpact",
      appIds: ["123456789"],
      release: { version: "4.2.0", releasedAt: "2026-07-20" },
      daysBefore: 7,
      daysAfter: 21,
      maxReviewsPerPeriod: 100,
    }),
    {
      appIds: ["123456789"],
      mode: "releaseImpact",
      country: "US",
      language: "en",
      release: { version: "4.2.0", releasedAt: "2026-07-20T00:00:00.000Z" },
      daysBefore: 7,
      daysAfter: 21,
      maxReviewsPerPeriod: 100,
      maxReviewsPerApp: 50,
      maxPagesPerApp: 10,
      requestTimeoutSecs: 30,
      debug: false,
      analysis: { enabled: true, outputLanguage: "english", maxAttempts: 2 },
      aggregation: { enabled: true, minimumClusterSize: 2 },
    },
  );
  assert.throws(
    () => normalizeInput({ mode: "releaseImpact", appIds: ["123456789"] }),
    /release\.releasedAt/i,
  );
});

test("collects paginated App Store reviews, deduplicates IDs, and records diagnostics", async () => {
  const requestedUrls = [];
  const responses = new Map([
    [
      1,
      new Response(
        feed([
          reviewEntry({ id: "review-1" }),
          reviewEntry({ id: "review-2" }),
        ]),
        { status: 200 },
      ),
    ],
    [
      2,
      new Response(
        feed([
          reviewEntry({ id: "review-2" }),
          reviewEntry({ id: "review-3" }),
        ]),
        { status: 200 },
      ),
    ],
  ]);
  const result = await collectAppStoreReviews({
    appId: "123456789",
    country: "US",
    language: "en",
    maxReviewsPerApp: 3,
    maxPagesPerApp: 2,
    fetchImpl: async (url) => {
      requestedUrls.push(String(url));
      const page = Number(new URL(url).pathname.match(/page=(\d+)/)?.[1] ?? 1);
      return responses.get(page);
    },
  });

  assert.equal(result.records.length, 3);
  assert.deepEqual(
    result.records.map((review) => review.reviewId),
    ["review-1", "review-2", "review-3"],
  );
  assert.equal(result.diagnostics.pagesFetched, 2);
  assert.equal(result.diagnostics.parsedReviewCount, 4);
  assert.match(
    requestedUrls[0],
    /customerreviews\/id=123456789\/sortby=mostrecent\/page=1\/json/,
  );
});

test("returns collected reviews plus a scoped error when a later App Store page fails", async () => {
  const result = await collectAppStoreReviews({
    appId: "123456789",
    country: "US",
    language: "en",
    maxReviewsPerApp: 20,
    maxPagesPerApp: 2,
    fetchImpl: async (url) =>
      String(url).includes("/page=1/")
        ? new Response(feed([reviewEntry({ id: "review-1" })]), { status: 200 })
        : new Response("not found", { status: 404 }),
  });

  assert.equal(result.records.length, 1);
  assert.equal(result.error.code, "APP_STORE_HTTP_ERROR");
  assert.equal(result.error.httpStatus, 404);
});
