import { describe, expect, it } from "vitest";

import { normalizeReview } from "../../src/steam/normalize-review.js";

const rawReview = {
  recommendationid: "review-1",
  author: {
    steamid: "76561198000000000",
    num_games_owned: 12,
    num_reviews: 4,
    playtime_forever: 180,
    playtime_last_two_weeks: 60,
    playtime_at_review: 120,
    deck_playtime_at_review: 30,
    primarily_steam_deck: true,
  },
  language: "english",
  review: "The game freezes when I open the inventory.",
  timestamp_created: 1785489964,
  timestamp_updated: 1785490064,
  voted_up: false,
  votes_up: 24,
  votes_funny: 1,
  weighted_vote_score: "0.82",
  comment_count: 3,
  steam_purchase: true,
  received_for_free: false,
  written_during_early_access: false,
};

describe("review normalization", () => {
  it("normalizes Steam review fields and converts playtime to minutes", () => {
    expect(
      normalizeReview({
        appId: "730",
        game: { steamAppId: 730, name: "Counter-Strike 2" },
        review: rawReview,
        scrapedAt: "2026-07-31T08:00:00.000Z",
      }),
    ).toEqual({
      recordType: "review",
      game: {
        steamAppId: 730,
        name: "Counter-Strike 2",
        storeUrl: "https://store.steampowered.com/app/730/",
      },
      review: {
        reviewId: "review-1",
        language: "english",
        text: "The game freezes when I open the inventory.",
        recommended: false,
        createdAt: "2026-07-31T09:26:04.000Z",
        updatedAt: "2026-07-31T09:27:44.000Z",
        votesHelpful: 24,
        votesFunny: 1,
        weightedVoteScore: 0.82,
        commentCount: 3,
        steamPurchase: true,
        receivedForFree: false,
        writtenDuringEarlyAccess: false,
        primarilySteamDeck: true,
      },
      author: {
        steamId: "76561198000000000",
        gamesOwned: 12,
        reviewsWritten: 4,
        playtimeForeverMinutes: 180,
        playtimeAtReviewMinutes: 120,
        playtimeLastTwoWeeksMinutes: 60,
        deckPlaytimeAtReviewMinutes: 30,
      },
      source: {
        platform: "steam",
        sourceType: "userReview",
        sourceUrl: "https://steamcommunity.com/app/730/reviews/",
        scrapedAt: "2026-07-31T08:00:00.000Z",
      },
    });
  });

  it("can omit review text while preserving provenance", () => {
    const result = normalizeReview({
      appId: "730",
      game: { steamAppId: 730, name: "Counter-Strike 2" },
      review: rawReview,
      includeReviewText: false,
      scrapedAt: "2026-07-31T08:00:00.000Z",
    });
    expect(result.review.text).toBeNull();
    expect(result.source.sourceUrl).toContain("/app/730/reviews/");
  });
});
