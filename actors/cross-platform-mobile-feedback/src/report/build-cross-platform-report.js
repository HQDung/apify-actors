import { validateCrossPlatformFeedbackReport } from "@project/cross-platform-comparison-core";

const platformFor = (id) => (id === "appleAppStore" ? "ios" : "android");
const fieldForDimension = (dimension) => {
  if (dimension === "country") return "countryCode";
  if (dimension === "language") return "language";
  return "version";
};
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
const analysisKeyFor = (entry) =>
  `${entry.normalizedFeedback?.source.platform}:${entry.normalizedFeedback?.source.sourceRecordId}`;

const dimensionInsights = ({
  reviews,
  analysisRecords,
  field,
  dimension,
  minimumDimensionReviews,
  languageAttribution = false,
}) => {
  const analyses = new Map(
    analysisRecords.map((entry) => [analysisKeyFor(entry), entry]),
  );
  const groups = new Map();
  for (const review of reviews) {
    const value = review.review?.[field];
    if (!value) continue;
    const platform = platformFor(review.platform?.id);
    const key = String(value);
    const group = groups.get(key) ?? {
      value: key,
      android: { reviews: [], analyses: [] },
      ios: { reviews: [], analyses: [] },
    };
    group[platform].reviews.push(review);
    const sourcePlatform =
      platform === "android" ? "google-play" : "apple-app-store";
    const analysis = analyses.get(
      `${sourcePlatform}:${review.review.reviewId}`,
    );
    if (analysis?.analysis?.analysisStatus === "success")
      group[platform].analyses.push(analysis);
    groups.set(key, group);
  }

  const summarize = (group) => {
    const ratings = ratingsFor(group.reviews);
    const negativeTopics = new Map();
    for (const entry of group.analyses) {
      if (entry.analysis.sentiment !== "negative") continue;
      for (const topic of entry.analysis.topics ?? [])
        negativeTopics.set(topic, (negativeTopics.get(topic) ?? 0) + 1);
    }
    return {
      reviewCount: group.reviews.length,
      averageRating: average(ratings),
      actionableReviews: group.analyses.filter(
        (entry) => entry.analysis.isActionableFeedback,
      ).length,
      negativeTopics: [...negativeTopics.entries()]
        .sort(
          (left, right) =>
            right[1] - left[1] || left[0].localeCompare(right[0]),
        )
        .map(([topic, mentionCount]) => ({ topic, mentionCount })),
    };
  };

  return [...groups.values()]
    .sort((left, right) => left.value.localeCompare(right.value))
    .map((group) => {
      const android = summarize(group.android);
      const ios = summarize(group.ios);
      const warnings = [];
      if (android.reviewCount < minimumDimensionReviews)
        warnings.push({
          code: "LOW_DIMENSION_SAMPLE",
          platform: "android",
          message: `Android has ${android.reviewCount} reviews for ${dimension} ${group.value}; ${minimumDimensionReviews} are required for a sufficient comparison.`,
        });
      if (ios.reviewCount < minimumDimensionReviews)
        warnings.push({
          code: "LOW_DIMENSION_SAMPLE",
          platform: "ios",
          message: `iOS has ${ios.reviewCount} reviews for ${dimension} ${group.value}; ${minimumDimensionReviews} are required for a sufficient comparison.`,
        });
      const androidAverage = android.averageRating;
      const iosAverage = ios.averageRating;
      return {
        dimension,
        [fieldForDimension(dimension)]: group.value,
        android,
        ios,
        ratingDifference:
          androidAverage === null || iosAverage === null
            ? null
            : Number((androidAverage - iosAverage).toFixed(2)),
        evidenceStatus: warnings.length === 0 ? "sufficient" : "limited",
        warnings,
        ...(languageAttribution
          ? {
              languageAttribution: "requested_store_locale_not_reviewer_origin",
            }
          : {}),
      };
    });
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
  minimumDimensionReviews = 5,
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
    countryInsights: dimensionInsights({
      reviews,
      analysisRecords,
      field: "countryCode",
      dimension: "country",
      minimumDimensionReviews,
    }),
    languageInsights: dimensionInsights({
      reviews,
      analysisRecords,
      field: "sourceLanguage",
      dimension: "language",
      minimumDimensionReviews,
      languageAttribution: true,
    }),
    versionInsights: dimensionInsights({
      reviews,
      analysisRecords,
      field: "appVersion",
      dimension: "version",
      minimumDimensionReviews,
    }),
    warnings,
    generatedAt,
  };
  return validateCrossPlatformFeedbackReport(report);
};

export const reportKeyForProduct = (productId) =>
  `CROSS_PLATFORM_REPORT_${String(productId).replace(/[^A-Za-z0-9_-]/g, "_")}`;
