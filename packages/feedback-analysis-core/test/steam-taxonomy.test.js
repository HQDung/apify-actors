import test from "node:test";
import assert from "node:assert/strict";

import { validateNormalizedFeedback } from "../src/index.js";
import { STEAM_TAXONOMY, toNormalizedFeedback } from "../../../actors/steam-game-feedback-analyzer/src/core/steam-contract-adapter.js";

test("Steam taxonomy extends shared values and normalizes a Steam review", () => {
  assert.ok(STEAM_TAXONOMY.feedbackTypes.includes("steamDeckIssue"));
  assert.ok(STEAM_TAXONOMY.topics.includes("crashes"));

  const normalized = toNormalizedFeedback({
    record: {
      game: { steamAppId: 730, name: "Counter-Strike 2", storeUrl: "https://store.steampowered.com/app/730/" },
      review: {
        reviewId: "review-1",
        language: "english",
        text: "The game crashes on Steam Deck.",
        recommended: false,
        createdAt: "2026-07-31T00:00:00.000Z",
        updatedAt: null,
        primarilySteamDeck: true,
      },
      author: { steamId: "public-id", playtimeForeverMinutes: 120 },
      source: { platform: "steam", sourceUrl: "https://steamcommunity.com/app/730/reviews/", scrapedAt: "2026-08-01T00:00:00.000Z" },
    },
  });

  assert.equal(validateNormalizedFeedback(normalized), normalized);
  assert.deepEqual(normalized.product, { productType: "game", productId: "730", name: "Counter-Strike 2", version: null });
  assert.equal(normalized.source.sourceRecordId, "review-1");
  assert.equal(normalized.environmentContext.device, "Steam Deck");
  assert.equal(normalized.feedback.rating, null);
});

