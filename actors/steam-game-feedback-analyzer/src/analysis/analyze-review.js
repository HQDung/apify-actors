import { analyzeFeedback } from "@project/feedback-analysis-core";

import { STEAM_TAXONOMY } from "../core/steam-contract-adapter.js";
import { validateAnalysis } from "./analysis-schema.js";
import { fallbackAnalyzeReview } from "./fallback-analysis.js";

const toSteamAnalysis = (result) => {
  const analysis = { ...result };
  delete analysis.analysisStatus;
  return validateAnalysis(analysis);
};

export const analyzeReview = (review) => {
  const result = analyzeFeedback({
    feedback: {
      feedback: {
        text: review.text ?? "",
        sourceLanguage: review.language ?? "unknown",
        isPositive: typeof review.recommended === "boolean" ? review.recommended : null,
      },
    },
    taxonomy: STEAM_TAXONOMY,
    options: { outputLanguage: review.analysisLanguage ?? "english" },
    fallback: ({ feedback, options }) => fallbackAnalyzeReview({
      text: feedback.feedback.text,
      language: feedback.feedback.sourceLanguage,
      recommended: feedback.feedback.isPositive,
      analysisLanguage: options.outputLanguage,
    }),
  });
  if (result instanceof Promise) return result.then(toSteamAnalysis);
  return toSteamAnalysis(result);
};
