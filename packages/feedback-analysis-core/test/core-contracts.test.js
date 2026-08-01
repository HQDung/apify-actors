import test from "node:test";
import assert from "node:assert/strict";

import {
  ANALYSIS_SCHEMA_VERSION,
  COMMON_FEEDBACK_TYPES,
  COMMON_TOPICS,
  ERROR_CODES,
  createTaxonomyConfig,
  validateAnalysisResult,
  validateNormalizedFeedback,
} from "../src/index.js";

const feedback = {
  source: {
    platform: "example",
    sourceRecordId: "review-1",
    sourceUrl: "https://example.test/review-1",
    collectedAt: "2026-08-01T00:00:00.000Z",
  },
  product: { productType: "product", productId: "product-1", name: "Example" },
  feedback: {
    text: "The product is slow after the latest update.",
    title: null,
    sourceLanguage: "english",
    createdAt: "2026-07-31T00:00:00.000Z",
    updatedAt: null,
    isPositive: false,
    rating: null,
  },
  authorContext: { publicAuthorId: null, experienceSignals: {} },
  environmentContext: { countryCode: null, appVersion: null, device: null, operatingSystem: null },
  sourceMetadata: {},
};

const analysis = {
  analysisStatus: "success",
  isActionableFeedback: true,
  actionabilityScore: 0.8,
  primaryFeedbackType: "performanceIssue",
  feedbackTypes: ["performanceIssue"],
  sentiment: "negative",
  severity: "medium",
  topics: ["performance"],
  summary: "The user reports slower performance after an update.",
  issue: null,
  featureRequest: null,
  positiveSignals: [],
  sourceLanguage: "english",
  analysisLanguage: "english",
  originalTextPreserved: true,
  modelMetadata: { provider: "test", model: "test", schemaVersion: ANALYSIS_SCHEMA_VERSION },
};

test("exports source-neutral normalized feedback and analysis contracts", () => {
  assert.equal(validateNormalizedFeedback(feedback), feedback);
  assert.equal(validateAnalysisResult(analysis, createTaxonomyConfig({ topics: ["performance"] })), analysis);
  assert.ok(COMMON_FEEDBACK_TYPES.includes("bugReport"));
  assert.ok(COMMON_TOPICS.includes("performance"));
  assert.equal(ERROR_CODES.ANALYSIS_FAILED, "ANALYSIS_FAILED");
});

test("taxonomy extensions validate without changing common constants", () => {
  const taxonomy = createTaxonomyConfig({
    feedbackTypes: ["deviceCompatibility"],
    topics: ["deviceModel"],
    promptContext: "mobile app feedback",
  });

  assert.ok(taxonomy.feedbackTypes.includes("deviceCompatibility"));
  assert.ok(taxonomy.topics.includes("deviceModel"));
  assert.equal(taxonomy.promptContext, "mobile app feedback");
  assert.ok(COMMON_FEEDBACK_TYPES.includes("bugReport"));
});

