import test from "node:test";
import assert from "node:assert/strict";

import {
  ANALYSIS_SCHEMA_VERSION,
  analyzeFeedback,
  createTaxonomyConfig,
  createUsageStats,
  normalizeConfidence,
} from "../src/index.js";

const taxonomy = createTaxonomyConfig({ topics: ["performance"] });
const feedback = {
  source: { platform: "example", sourceRecordId: "review-1", sourceUrl: null, collectedAt: "2026-08-01T00:00:00.000Z" },
  product: { productType: "product", productId: "product-1", name: "Example", version: null },
  feedback: { text: "The product is slow after the update.", title: null, sourceLanguage: "english", createdAt: null, updatedAt: null, isPositive: false, rating: null },
};

const validAnalysis = (summary = "The user reports slower performance.") => ({
  isActionableFeedback: true,
  actionabilityScore: 0.8,
  primaryFeedbackType: "performanceIssue",
  feedbackTypes: ["performanceIssue"],
  sentiment: "negative",
  severity: "medium",
  topics: ["performance"],
  summary,
  issue: null,
  featureRequest: null,
  positiveSignals: [],
  sourceLanguage: "english",
  analysisLanguage: "english",
  originalTextPreserved: true,
  modelMetadata: { provider: "test", model: "test", schemaVersion: ANALYSIS_SCHEMA_VERSION },
});

test("analyzes feedback through an injected provider and passes output language", async () => {
  const prompts = [];
  const usage = createUsageStats();
  const result = await analyzeFeedback({
    feedback,
    taxonomy,
    provider: async ({ prompt, options }) => {
      prompts.push({ prompt, outputLanguage: options.outputLanguage });
      return JSON.stringify(validAnalysis());
    },
    options: { outputLanguage: "vietnamese", maxAttempts: 1 },
    usage,
  });

  assert.equal(result.analysisStatus, "success");
  assert.equal(result.analysisLanguage, "vietnamese");
  assert.equal(prompts.length, 1);
  assert.equal(prompts[0].outputLanguage, "vietnamese");
  assert.match(prompts[0].prompt, /The product is slow/);
  assert.equal(usage.summary().providerAttempts, 1);
});

test("retries invalid provider JSON and falls back after the retry budget", async () => {
  let attempts = 0;
  const warnings = [];
  const usage = createUsageStats();
  const result = await analyzeFeedback({
    feedback,
    taxonomy,
    provider: async () => {
      attempts += 1;
      return attempts === 1 ? "not-json" : validAnalysis("provider recovered");
    },
    options: { maxAttempts: 2 },
    usage,
    logger: { warning: (message) => warnings.push(message) },
  });

  assert.equal(result.analysisStatus, "success");
  assert.equal(result.summary, "provider recovered");
  assert.equal(attempts, 2);
  assert.equal(usage.summary().providerAttempts, 2);
  assert.equal(warnings.length, 1);
});

test("returns a validated fallback result when the provider remains invalid", async () => {
  const result = await analyzeFeedback({
    feedback,
    taxonomy,
    provider: async () => "still-invalid",
    options: { maxAttempts: 2 },
    fallback: () => validAnalysis("fallback result"),
  });

  assert.deepEqual(result, { analysisStatus: "success", ...validAnalysis("fallback result") });
});

test("normalizes confidence values before schema validation", () => {
  assert.equal(normalizeConfidence(1.234), 1);
  assert.equal(normalizeConfidence(-0.4), 0);
  assert.equal(normalizeConfidence("not-a-number"), 0);
});
