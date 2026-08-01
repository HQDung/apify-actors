const finiteNumber = (value, fallback = null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const timestampToIso = (value) => {
  const timestamp = finiteNumber(value);
  if (timestamp === null || timestamp <= 0) return null;
  return new Date(timestamp * 1000).toISOString();
};

export const normalizeReview = ({
  appId,
  game,
  review,
  includeReviewText = true,
  scrapedAt = new Date().toISOString(),
}) => {
  const numericAppId = Number(appId);
  const steamId = review.author?.steamid ? String(review.author.steamid) : null;
  return {
    recordType: "review",
    game: {
      steamAppId: numericAppId,
      name: game.name ?? `Steam app ${numericAppId}`,
      storeUrl: `https://store.steampowered.com/app/${numericAppId}/`,
    },
    review: {
      reviewId: String(review.recommendationid),
      language: review.language ?? "unknown",
      text: includeReviewText ? String(review.review ?? "").trim() : null,
      recommended: Boolean(review.voted_up),
      createdAt: timestampToIso(review.timestamp_created),
      updatedAt: timestampToIso(review.timestamp_updated),
      votesHelpful: finiteNumber(review.votes_up, 0),
      votesFunny: finiteNumber(review.votes_funny, 0),
      weightedVoteScore: finiteNumber(review.weighted_vote_score, 0),
      commentCount: finiteNumber(review.comment_count, 0),
      steamPurchase: Boolean(review.steam_purchase),
      receivedForFree: Boolean(review.received_for_free),
      writtenDuringEarlyAccess: Boolean(review.written_during_early_access),
      primarilySteamDeck: Boolean(review.primarily_steam_deck ?? review.author?.primarily_steam_deck),
    },
    author: {
      steamId,
      gamesOwned: finiteNumber(review.author?.num_games_owned, 0),
      reviewsWritten: finiteNumber(review.author?.num_reviews, 0),
      playtimeForeverMinutes: finiteNumber(review.author?.playtime_forever, 0),
      playtimeAtReviewMinutes: finiteNumber(review.author?.playtime_at_review, 0),
      playtimeLastTwoWeeksMinutes: finiteNumber(review.author?.playtime_last_two_weeks, 0),
      deckPlaytimeAtReviewMinutes: finiteNumber(review.author?.deck_playtime_at_review, 0),
    },
    source: {
      platform: "steam",
      sourceType: "userReview",
      sourceUrl: `https://steamcommunity.com/app/${numericAppId}/reviews/`,
      scrapedAt,
    },
  };
};
