import { validateNormalizedFeedback } from "@project/feedback-analysis-core";

const normalizeDate = (value) => {
  if (!value) return null;
  const timestamp = Date.parse(String(value));
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
};

const positiveSignal = (rating) => {
  if (!Number.isFinite(rating)) return null;
  if (rating >= 4) return true;
  if (rating <= 2) return false;
  return null;
};

export const toNormalizedFeedback = ({ record, diagnostics = {} }) => {
  const rating = Number.isFinite(Number(record.rating))
    ? Number(record.rating)
    : null;
  const normalized = {
    source: {
      platform: "apple-app-store",
      sourceRecordId: String(record.reviewId),
      sourceUrl: diagnostics.url ?? null,
      collectedAt: diagnostics.collectedAt ?? "1970-01-01T00:00:00.000Z",
    },
    product: {
      productType: "app",
      productId: String(record.appId),
      name: null,
      version: record.appVersion ?? null,
    },
    feedback: {
      text: record.text ?? "",
      title: record.title ?? null,
      sourceLanguage: record.source?.language ?? "unknown",
      createdAt: normalizeDate(record.reviewDateText),
      updatedAt: null,
      isPositive: positiveSignal(rating),
      rating,
    },
    environmentContext: {
      countryCode: record.source?.country ?? null,
      appVersion: record.appVersion ?? null,
      device: null,
      operatingSystem: "iOS",
    },
    sourceMetadata: {
      helpfulCount: record.helpfulCount ?? null,
      developerReply: record.developerReply ?? null,
    },
  };
  return validateNormalizedFeedback(normalized);
};
