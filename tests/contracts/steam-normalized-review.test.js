import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { normalizeReview } from "../../actors/steam-game-feedback-analyzer/src/steam/normalize-review.js";

const fixture = JSON.parse(await readFile(fileURLToPath(new URL("../../actors/steam-game-feedback-analyzer/test/fixtures/steam/app-730-english-page.json", import.meta.url)), "utf8"));
const sourceReview = fixture.reviews[0];

test("Steam normalization preserves the source provenance contract", () => {
  const record = normalizeReview({
    appId: "730",
    game: { name: "Counter-Strike 2" },
    review: sourceReview,
    scrapedAt: "2026-08-01T04:00:00.000Z",
  });

  assert.deepEqual(record.game, {
    steamAppId: 730,
    name: "Counter-Strike 2",
    storeUrl: "https://store.steampowered.com/app/730/",
  });
  assert.equal(record.recordType, "review");
  assert.equal(record.source.platform, "steam");
  assert.equal(record.source.scrapedAt, "2026-08-01T04:00:00.000Z");
  assert.equal(record.review.reviewId, String(sourceReview.recommendationid));
  assert.equal(record.review.language, sourceReview.language);
  assert.equal(typeof record.review.recommended, "boolean");
  assert.equal(typeof record.author.gamesOwned, "number");
});

test("Steam normalization can omit review text without changing review identity", () => {
  const record = normalizeReview({
    appId: 730,
    game: { name: "Counter-Strike 2" },
    review: sourceReview,
    includeReviewText: false,
  });

  assert.equal(record.review.text, null);
  assert.equal(record.review.reviewId, String(sourceReview.recommendationid));
});

