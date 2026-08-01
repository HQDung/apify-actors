import { validateNormalizedFeedback } from "@project/feedback-analysis-core";

const normalizeRating = (value) => {
  const rating = Number(value);
  return Number.isFinite(rating) && rating >= 0 ? rating : null;
};

const positiveSignal = (rating) => {
  if (rating === null) return null;
  if (rating >= 4) return true;
  if (rating <= 2) return false;
  return null;
};

export const toNormalizedFeedback = ({ record }) => {
  const rating = normalizeRating(record.review.rating);
  const platform =
    record.platform.id === "appleAppStore" ? "apple-app-store" : "google-play";
  const normalized = {
    source: {
      platform,
      sourceRecordId: String(record.review.reviewId),
      sourceUrl: record.source.sourceUrl ?? null,
      collectedAt: record.source.collectedAt,
    },
    product: {
      productType: "app",
      productId: String(record.product.productId),
      name: record.product.name ?? null,
      version: record.review.appVersion ?? null,
    },
    feedback: {
      text: record.review.text ?? "",
      title: record.review.title ?? null,
      sourceLanguage: record.review.sourceLanguage ?? "unknown",
      createdAt: record.review.createdAt ?? null,
      updatedAt: record.review.updatedAt ?? null,
      isPositive: positiveSignal(rating),
      rating,
    },
    environmentContext: {
      countryCode: record.review.countryCode ?? null,
      appVersion: record.review.appVersion ?? null,
      device: record.environmentContext?.device ?? null,
      operatingSystem: record.environmentContext?.operatingSystem ?? null,
    },
    sourceMetadata: {
      platformId: record.platform.id,
      appId: record.platform.appId,
      helpfulCount: record.review.helpfulCount ?? null,
      developerReply: record.developerReply ?? null,
    },
  };
  return validateNormalizedFeedback(normalized);
};
