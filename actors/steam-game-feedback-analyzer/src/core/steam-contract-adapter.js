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
  const source = record.source ?? {};
  const game = record.game ?? {};
  const review = record.review ?? {};
  const normalized = {
    source: {
      platform: "steam",
      sourceRecordId: String(review.reviewId),
      sourceUrl: source.sourceUrl ?? null,
      collectedAt: source.scrapedAt ?? review.createdAt ?? "1970-01-01T00:00:00.000Z",
    },
    product: {
      productType: "game",
      productId: String(game.steamAppId),
      name: game.name ?? null,
      version: null,
    },
    feedback: {
      text: review.text ?? "",
      title: null,
      sourceLanguage: review.language ?? "unknown",
      createdAt: review.createdAt ?? null,
      updatedAt: review.updatedAt ?? null,
      isPositive: typeof review.recommended === "boolean" ? review.recommended : null,
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
      device: review.primarilySteamDeck ? "Steam Deck" : null,
      operatingSystem: null,
    },
    sourceMetadata: {
      recommended: review.recommended ?? null,
      votesHelpful: review.votesHelpful ?? null,
      votesFunny: review.votesFunny ?? null,
    },
  };
  return validateNormalizedFeedback(normalized);
};

export const toCoreAnalysisRecord = (record) => ({
  ...toNormalizedFeedback({ record }),
  analysis: {
    ...(record.analysis ?? {}),
    analysisStatus: record.analysisStatus ?? (record.analysis ? "success" : "failed"),
    ...(record.analysisError ? { analysisError: record.analysisError } : {}),
  },
});
