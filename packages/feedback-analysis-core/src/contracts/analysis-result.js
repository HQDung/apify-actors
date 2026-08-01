import { ERROR_CODES } from "../errors/error-codes.js";
import { severities } from "../taxonomy/severity.js";
import { COMMON_FEEDBACK_TYPES, COMMON_SENTIMENTS } from "../taxonomy/common-feedback-types.js";

export const ANALYSIS_SCHEMA_VERSION = "1.0";

const assert = (condition, message) => {
  if (!condition) throw new Error(`${ERROR_CODES.ANALYSIS_SCHEMA_INVALID}: ${message}`);
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const stringArray = (value, name) => assert(Array.isArray(value) && value.every((entry) => typeof entry === "string"), `${name} must be a string array.`);

export const validateAnalysisResult = (result, taxonomy) => {
  assert(isObject(result), "analysis result must be an object.");
  assert(["success", "failed"].includes(result.analysisStatus), "analysisStatus is invalid.");
  if (result.analysisStatus === "failed") {
    assert(isObject(result.analysisError), "failed analysis requires analysisError.");
    assert(typeof result.analysisError.code === "string", "analysisError.code is required.");
    return result;
  }

  assert(typeof result.isActionableFeedback === "boolean", "isActionableFeedback must be boolean.");
  assert(Number.isFinite(result.actionabilityScore) && result.actionabilityScore >= 0 && result.actionabilityScore <= 1, "actionabilityScore must be between 0 and 1.");
  const allowedTypes = taxonomy?.feedbackTypes ?? COMMON_FEEDBACK_TYPES;
  const allowedTopics = taxonomy?.topics ?? [];
  assert(allowedTypes.includes(result.primaryFeedbackType), "primaryFeedbackType is not in the configured taxonomy.");
  stringArray(result.feedbackTypes, "feedbackTypes");
  assert(result.feedbackTypes.every((type) => allowedTypes.includes(type)), "feedbackTypes contains an unknown type.");
  assert(COMMON_SENTIMENTS.includes(result.sentiment), "sentiment is invalid.");
  assert(severities.includes(result.severity), "severity is invalid.");
  stringArray(result.topics, "topics");
  assert(result.topics.every((topic) => allowedTopics.includes(topic)), "topics contains an unknown topic.");
  assert(typeof result.summary === "string", "summary must be a string.");
  assert(typeof result.sourceLanguage === "string", "sourceLanguage must be a string.");
  assert(typeof result.analysisLanguage === "string", "analysisLanguage must be a string.");
  assert(result.originalTextPreserved === true, "originalTextPreserved must be true.");
  assert(result.modelMetadata?.schemaVersion === ANALYSIS_SCHEMA_VERSION, "modelMetadata schema version is invalid.");
  return result;
};
