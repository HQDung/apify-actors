import assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeAppStoreFeedback } from "../src/analysis/app-store-analysis.js";
import { toNormalizedFeedback } from "../src/core/app-store-contract-adapter.js";

test("maps an English App Store review to the shared normalized feedback contract", () => {
  const normalized = toNormalizedFeedback({
    record: {
      reviewId: "review-1",
      appId: "123456789",
      rating: 2,
      title: "Login fails",
      text: "The app crashes during login.",
      reviewDateText: "2026-07-30T08:00:00-07:00",
      appVersion: "4.2.0",
      helpfulCount: 14,
      developerReply: null,
      source: { country: "US", language: "en" },
    },
    diagnostics: {
      url: "https://itunes.apple.com/us/rss/customerreviews/id=123456789/sortby=mostrecent/page=1/json",
      collectedAt: "2026-08-01T00:00:00.000Z",
    },
  });

  assert.equal(normalized.source.platform, "apple-app-store");
  assert.equal(normalized.source.sourceRecordId, "review-1");
  assert.equal(normalized.product.productId, "123456789");
  assert.equal(normalized.feedback.title, "Login fails");
  assert.equal(normalized.feedback.createdAt, "2026-07-30T15:00:00.000Z");
  assert.equal(normalized.feedback.isPositive, false);
  assert.equal(normalized.environmentContext.appVersion, "4.2.0");
  assert.deepEqual(normalized.sourceMetadata, {
    helpfulCount: 14,
    developerReply: null,
  });
});

test("preserves Vietnamese source language and nullable Apple metadata", () => {
  const normalized = toNormalizedFeedback({
    record: {
      reviewId: "review-vi",
      appId: "123456789",
      rating: 3,
      title: "Ổn",
      text: "Ứng dụng hoạt động tốt.",
      reviewDateText: null,
      appVersion: null,
      helpfulCount: null,
      developerReply: null,
      source: { country: "VN", language: "vi" },
    },
    diagnostics: { collectedAt: "2026-08-01T00:00:00.000Z" },
  });

  assert.equal(normalized.feedback.sourceLanguage, "vi");
  assert.equal(normalized.feedback.createdAt, null);
  assert.equal(normalized.product.version, null);
  assert.equal(normalized.environmentContext.countryCode, "VN");
});

test("uses the shared analysis core for English and Vietnamese normalized reviews", () => {
  const english = toNormalizedFeedback({
    record: {
      reviewId: "review-en",
      appId: "123456789",
      rating: 1,
      title: "Crash",
      text: "The app crashes every time I open it.",
      source: { country: "US", language: "en" },
    },
    diagnostics: { collectedAt: "2026-08-01T00:00:00.000Z" },
  });
  const vietnamese = toNormalizedFeedback({
    record: {
      reviewId: "review-vi",
      appId: "123456789",
      rating: 2,
      title: "Lỗi",
      text: "Ứng dụng bị lỗi khi đăng nhập.",
      source: { country: "VN", language: "vi" },
    },
    diagnostics: { collectedAt: "2026-08-01T00:00:00.000Z" },
  });

  const englishAnalysis = analyzeAppStoreFeedback({
    feedback: english,
    options: { outputLanguage: "english", maxAttempts: 1 },
  });
  const vietnameseAnalysis = analyzeAppStoreFeedback({
    feedback: vietnamese,
    options: { outputLanguage: "english", maxAttempts: 1 },
  });
  assert.equal(englishAnalysis.analysisStatus, "success");
  assert.equal(vietnameseAnalysis.analysisStatus, "success");
  assert.equal(vietnameseAnalysis.sourceLanguage, "vi");
  assert.equal(englishAnalysis.originalTextPreserved, true);
});
