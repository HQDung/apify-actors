import { feedbackTypes, severities, topicIds } from "../config/taxonomy.js";

export const ANALYSIS_SCHEMA_VERSION = "1.0";

const assert = (condition, message) => {
  if (!condition) throw new Error(`ANALYSIS_SCHEMA_INVALID: ${message}`);
};

const assertEnum = (value, values, name) => assert(values.includes(value), `${name} is invalid.`);
const assertStringArray = (value, name) => {
  assert(Array.isArray(value) && value.every((entry) => typeof entry === "string"), `${name} must be a string array.`);
};

export const validateAnalysis = (analysis) => {
  assert(analysis && typeof analysis === "object" && !Array.isArray(analysis), "analysis must be an object.");
  assert(typeof analysis.isActionableFeedback === "boolean", "isActionableFeedback must be boolean.");
  assert(Number.isFinite(analysis.actionabilityScore) && analysis.actionabilityScore >= 0 && analysis.actionabilityScore <= 1, "actionabilityScore must be between 0 and 1.");
  assertEnum(analysis.primaryFeedbackType, feedbackTypes, "primaryFeedbackType");
  assertStringArray(analysis.feedbackTypes, "feedbackTypes");
  assert(analysis.feedbackTypes.every((type) => feedbackTypes.includes(type)), "feedbackTypes contains an unknown type.");
  assertEnum(analysis.sentiment, ["positive", "negative", "mixed", "neutral"], "sentiment");
  assertEnum(analysis.severity, severities, "severity");
  assertStringArray(analysis.topics, "topics");
  assert(analysis.topics.every((topic) => topicIds.includes(topic)), "topics contains an unknown topic.");
  assert(typeof analysis.summary === "string", "summary must be a string.");
  assert(typeof analysis.sourceLanguage === "string", "sourceLanguage must be a string.");
  assert(typeof analysis.analysisLanguage === "string", "analysisLanguage must be a string.");
  assert(analysis.originalTextPreserved === true, "originalTextPreserved must be true.");
  assert(analysis.modelMetadata?.schemaVersion === ANALYSIS_SCHEMA_VERSION, "modelMetadata schema version is invalid.");
  return analysis;
};
