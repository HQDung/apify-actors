import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ANALYSIS_SCHEMA_VERSION,
  validateAnalysis,
} from "../../src/analysis/analysis-schema.js";
import { analyzeReview } from "../../src/analysis/analyze-review.js";

const fixtures = JSON.parse(
  await readFile(fileURLToPath(new URL("../fixtures/reviews/review-fixtures.json", import.meta.url)), "utf8"),
);
const fixture = (name) => fixtures.find((entry) => entry.name === name);

describe("review-level feedback analysis", () => {
  it("detects a specific crash with actionable issue details", () => {
    const result = analyzeReview(fixture("specific crash"));
    expect(result).toMatchObject({
      isActionableFeedback: true,
      primaryFeedbackType: "bugReport",
      sentiment: "negative",
      severity: "high",
      sourceLanguage: "english",
      analysisLanguage: "english",
    });
    expect(result.feedbackTypes).toEqual(expect.arrayContaining(["bugReport", "stabilityIssue"]));
    expect(result.topics).toEqual(expect.arrayContaining(["crashes", "inventory"]));
    expect(result.issue).toMatchObject({
      title: expect.stringContaining("crash"),
      triggerSignals: expect.arrayContaining(["opening the inventory"]),
    });
    expect(result.actionabilityScore).toBeGreaterThan(0.8);
  });

  it("keeps a generic complaint non-actionable", () => {
    const result = analyzeReview(fixture("generic negative"));
    expect(result).toMatchObject({
      isActionableFeedback: false,
      primaryFeedbackType: "generalComplaint",
      sentiment: "negative",
      severity: "unknown",
    });
    expect(result.actionabilityScore).toBeLessThan(0.2);
  });

  it("classifies positive gameplay praise without inventing an issue", () => {
    const result = analyzeReview(fixture("positive gameplay"));
    expect(result).toMatchObject({
      primaryFeedbackType: "positiveFeedback",
      sentiment: "positive",
      severity: "unknown",
      issue: null,
      featureRequest: null,
    });
    expect(result.topics).toEqual(expect.arrayContaining(["combat", "worldDesign"]));
    expect(result.positiveSignals.length).toBeGreaterThan(0);
  });

  it("extracts a feature request and related topics", () => {
    const result = analyzeReview(fixture("feature request"));
    expect(result).toMatchObject({
      isActionableFeedback: true,
      primaryFeedbackType: "featureRequest",
      sentiment: "positive",
      featureRequest: { title: expect.stringContaining("manual save") },
    });
    expect(result.topics).toEqual(expect.arrayContaining(["saveSystem", "inventory"]));
  });

  it.each([
    ["performance complaint", ["performanceIssue", "stabilityIssue"], ["stuttering", "frameRate", "steamDeck"]],
    ["controller complaint", ["controllerIssue"], ["controllerSupport", "userInterface"]],
    ["Steam Deck complaint", ["performanceIssue", "steamDeckIssue"], ["freezes", "loadingTime", "steamDeck"]],
    ["localization complaint", ["localizationIssue"], ["localization", "subtitles"]],
  ])("classifies %s with stable feedback/topic IDs", (name, types, topics) => {
    const result = analyzeReview(fixture(name));
    expect(result.feedbackTypes).toEqual(expect.arrayContaining(types));
    expect(result.topics).toEqual(expect.arrayContaining(topics));
    expect(result).toHaveProperty("issue");
  });

  it("preserves Vietnamese source language while emitting English taxonomy IDs", () => {
    const result = analyzeReview(fixture("Vietnamese bug report"));
    expect(result).toMatchObject({
      sourceLanguage: "vietnamese",
      analysisLanguage: "english",
      originalTextPreserved: true,
      primaryFeedbackType: "bugReport",
      sentiment: "negative",
    });
    expect(result.topics).toEqual(expect.arrayContaining(["freezes", "inventory", "disconnects"]));
  });

  it("treats short praise and meme text as low-actionability feedback", () => {
    expect(analyzeReview(fixture("very short")).isActionableFeedback).toBe(false);
    expect(analyzeReview(fixture("joke or meme")).actionabilityScore).toBeLessThan(0.5);
  });

  it("keeps multiple issue types and topics in one analysis", () => {
    const result = analyzeReview(fixture("multiple issues"));
    expect(result.feedbackTypes).toEqual(expect.arrayContaining(["bugReport", "matchmakingIssue", "usabilityIssue"]));
    expect(result.topics).toEqual(expect.arrayContaining(["saveSystem", "disconnects", "userInterface"]));
  });

  it("returns a schema-valid strict object", () => {
    const result = analyzeReview(fixture("specific crash"));
    expect(result.modelMetadata.schemaVersion).toBe(ANALYSIS_SCHEMA_VERSION);
    expect(() => validateAnalysis(result)).not.toThrow();
  });
});
