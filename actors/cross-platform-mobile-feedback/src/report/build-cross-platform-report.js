import { validateCrossPlatformFeedbackReport } from "@project/cross-platform-comparison-core";

const platformFor = (id) => (id === "appleAppStore" ? "ios" : "android");
const recordsForPlatform = (reviews, platform) =>
  reviews.filter((review) => review.platform?.id === platform);
const ratingsFor = (reviews) =>
  reviews
    .map((review) => review.review?.rating)
    .filter((rating) => Number.isFinite(rating));
const average = (values) =>
  values.length > 0
    ? Number(
        (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(
          2,
        ),
      )
    : null;
const countBy = (records, valueFor) => {
  const counts = new Map();
  for (const record of records) {
    const value = valueFor(record);
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries(counts);
};

const reviewWindowFor = (reviews, dateRange) => {
  const dates = reviews
    .map((review) => review.review?.createdAt)
    .filter(Boolean)
    .sort();
  return {
    from: dateRange?.from ?? dates[0] ?? null,
    to: dateRange?.to ?? dates.at(-1) ?? null,
  };
};

const warning = (
  platform,
  message,
  code = "INSUFFICIENT_CROSS_PLATFORM_DATA",
) => ({ code, platform, message });

export const buildCrossPlatformReport = ({
  product,
  reviews,
  analysisRecords,
  comparisons,
  platformEvidence = {},
  dateRange = {},
  sourceErrors = [],
  generatedAt = new Date().toISOString(),
}) => {
  const googleReviews = recordsForPlatform(reviews, "googlePlay");
  const appleReviews = recordsForPlatform(reviews, "appleAppStore");
  const googleAnalyses = analysisRecords.filter(
    (entry) =>
      entry.normalizedFeedback?.source.platform === "google-play" &&
      entry.analysis?.analysisStatus === "success",
  );
  const appleAnalyses = analysisRecords.filter(
    (entry) =>
      entry.normalizedFeedback?.source.platform === "apple-app-store" &&
      entry.analysis?.analysisStatus === "success",
  );
  const sharedIssues = comparisons.filter(
    (comparison) =>
      comparison.classification === "shared" &&
      comparison.feedbackType !== "featureRequest",
  );
  const sharedFeatureRequests = comparisons.filter(
    (comparison) =>
      comparison.classification === "shared" &&
      comparison.feedbackType === "featureRequest",
  );
  const androidOnlyIssues = comparisons.filter((comparison) =>
    ["androidOnly", "platformDominantAndroid"].includes(
      comparison.classification,
    ),
  );
  const iosOnlyIssues = comparisons.filter((comparison) =>
    ["iosOnly", "platformDominantIos"].includes(comparison.classification),
  );
  const warnings = [];
  if (
    (platformEvidence.googlePlayReviewsCollected ?? googleReviews.length) === 0
  )
    warnings.push(warning("android", "No Google Play reviews were collected."));
  if (
    (platformEvidence.appleAppStoreReviewsCollected ?? appleReviews.length) ===
    0
  )
    warnings.push(warning("ios", "No Apple App Store reviews were collected."));
  for (const error of sourceErrors)
    warnings.push(
      warning(
        platformFor(error.platform),
        error.message ?? "A source request failed.",
        "SOURCE_PARTIAL_FAILURE",
      ),
    );
  const report = {
    recordType: "crossPlatformFeedbackReport",
    product,
    reviewWindow: reviewWindowFor(reviews, dateRange),
    statistics: {
      googlePlayReviewsCollected: googleReviews.length,
      appleAppStoreReviewsCollected: appleReviews.length,
      googlePlayActionableReviews: googleAnalyses.filter(
        (entry) => entry.analysis.isActionableFeedback,
      ).length,
      appleAppStoreActionableReviews: appleAnalyses.filter(
        (entry) => entry.analysis.isActionableFeedback,
      ).length,
      googlePlayAverageRating: average(ratingsFor(googleReviews)),
      appleAppStoreAverageRating: average(ratingsFor(appleReviews)),
    },
    sharedIssues,
    androidOnlyIssues,
    iosOnlyIssues,
    sharedFeatureRequests,
    platformDifferences: {
      ratingDifference:
        average(ratingsFor(googleReviews)) === null ||
        average(ratingsFor(appleReviews)) === null
          ? null
          : Number(
              (
                average(ratingsFor(googleReviews)) -
                average(ratingsFor(appleReviews))
              ).toFixed(2),
            ),
      reviewVolumeDifference: googleReviews.length - appleReviews.length,
      actionableDifference:
        googleAnalyses.filter((entry) => entry.analysis.isActionableFeedback)
          .length -
        appleAnalyses.filter((entry) => entry.analysis.isActionableFeedback)
          .length,
    },
    countryInsights: [
      ...Object.entries(
        countBy(googleReviews, (review) => review.review?.countryCode),
      ).map(([countryCode, mentionCount]) => ({
        platform: "android",
        countryCode,
        mentionCount,
      })),
      ...Object.entries(
        countBy(appleReviews, (review) => review.review?.countryCode),
      ).map(([countryCode, mentionCount]) => ({
        platform: "ios",
        countryCode,
        mentionCount,
      })),
    ],
    languageInsights: [
      ...Object.entries(
        countBy(googleReviews, (review) => review.review?.sourceLanguage),
      ).map(([language, mentionCount]) => ({
        platform: "android",
        language,
        mentionCount,
      })),
      ...Object.entries(
        countBy(appleReviews, (review) => review.review?.sourceLanguage),
      ).map(([language, mentionCount]) => ({
        platform: "ios",
        language,
        mentionCount,
      })),
    ],
    versionInsights: [
      ...Object.entries(
        countBy(googleReviews, (review) => review.review?.appVersion),
      ).map(([version, mentionCount]) => ({
        platform: "android",
        version,
        mentionCount,
      })),
      ...Object.entries(
        countBy(appleReviews, (review) => review.review?.appVersion),
      ).map(([version, mentionCount]) => ({
        platform: "ios",
        version,
        mentionCount,
      })),
    ],
    warnings,
    generatedAt,
  };
  return validateCrossPlatformFeedbackReport(report);
};

export const reportKeyForProduct = (productId) =>
  `CROSS_PLATFORM_REPORT_${String(productId).replace(/[^A-Za-z0-9_-]/g, "_")}`;
