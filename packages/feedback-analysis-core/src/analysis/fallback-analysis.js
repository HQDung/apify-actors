import { ANALYSIS_SCHEMA_VERSION } from "../contracts/analysis-result.js";

export const fallbackAnalyzeFeedback = ({ feedback, options = {} }) => {
  const text = String(feedback?.feedback?.text ?? feedback?.text ?? "").trim();
  const sourceLanguage = feedback?.feedback?.sourceLanguage ?? feedback?.sourceLanguage ?? "unknown";
  const isPositive = feedback?.feedback?.isPositive;
  const sentiment = isPositive === true ? "positive" : isPositive === false ? "negative" : "neutral";
  const primaryFeedbackType = isPositive === true ? "positiveFeedback" : text.length < 10 ? "nonActionable" : "generalComplaint";
  return {
    isActionableFeedback: false,
    actionabilityScore: text.length >= 30 ? 0.25 : 0.08,
    primaryFeedbackType,
    feedbackTypes: [primaryFeedbackType],
    sentiment,
    severity: "unknown",
    topics: [],
    summary: text ? "The feedback lacks a specific product detail for reliable classification." : "The feedback contains no usable text.",
    issue: null,
    featureRequest: null,
    positiveSignals: isPositive === true ? ["user marked the feedback positive"] : [],
    sourceLanguage,
    analysisLanguage: options.outputLanguage ?? "english",
    originalTextPreserved: true,
    modelMetadata: { provider: "deterministic-fallback", model: "feedback-core-v1", schemaVersion: ANALYSIS_SCHEMA_VERSION },
  };
};
