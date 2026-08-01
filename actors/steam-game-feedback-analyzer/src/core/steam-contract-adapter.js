import {
  createTaxonomyConfig,
  validateNormalizedFeedback,
} from "../../../../packages/feedback-analysis-core/src/index.js";
import { feedbackTypes, topicIds } from "../config/taxonomy.js";

export const STEAM_TAXONOMY = createTaxonomyConfig({
  feedbackTypes,
  topics: topicIds,
  promptContext: "public game reviews and player feedback",
});

export const toNormalizedFeedback = ({ record }) => {
  const normalized = {
    source: {
      platform: "steam",
      sourceRecordId: String(record.review.reviewId),
      sourceUrl: record.source.sourceUrl ?? null,
      collectedAt: record.source.scrapedAt,
    },
    product: {
      productType: "game",
      productId: String(record.game.steamAppId),
      name: record.game.name ?? null,
      version: null,
    },
    feedback: {
      text: record.review.text ?? "",
      title: null,
      sourceLanguage: record.review.language ?? "unknown",
      createdAt: record.review.createdAt ?? null,
      updatedAt: record.review.updatedAt ?? null,
      isPositive: typeof record.review.recommended === "boolean" ? record.review.recommended : null,
      rating: null,
    },
    authorContext: {
      publicAuthorId: record.author?.steamId ?? null,
      experienceSignals: {
        gamesOwned: record.author?.gamesOwned ?? null,
        playtimeForeverMinutes: record.author?.playtimeForeverMinutes ?? null,
      },
    },
    environmentContext: {
      countryCode: null,
      appVersion: null,
      device: record.review.primarilySteamDeck ? "Steam Deck" : null,
      operatingSystem: null,
    },
    sourceMetadata: {
      recommended: record.review.recommended ?? null,
      votesHelpful: record.review.votesHelpful ?? null,
      votesFunny: record.review.votesFunny ?? null,
    },
  };
  return validateNormalizedFeedback(normalized);
};
