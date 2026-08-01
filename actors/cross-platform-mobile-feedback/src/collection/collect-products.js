import {
  collectAppStoreReviews,
  collectGooglePlayReviews,
} from "@project/mobile-feedback-source-adapters";

const defaultCollectors = {
  googlePlay: collectGooglePlayReviews,
  appleAppStore: collectAppStoreReviews,
};
const monthNumbers = new Map([
  ["january", 1],
  ["february", 2],
  ["march", 3],
  ["april", 4],
  ["may", 5],
  ["june", 6],
  ["july", 7],
  ["august", 8],
  ["september", 9],
  ["october", 10],
  ["november", 11],
  ["december", 12],
]);

const normalizeDate = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const vietnamese = text.match(/^(\d{1,2})\s+tháng\s+(\d{1,2}),\s+(\d{4})$/i);
  if (vietnamese)
    return new Date(
      Date.UTC(
        Number(vietnamese[3]),
        Number(vietnamese[2]) - 1,
        Number(vietnamese[1]),
      ),
    ).toISOString();
  const english = text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (english && monthNumbers.has(english[1].toLowerCase()))
    return new Date(
      Date.UTC(
        Number(english[3]),
        monthNumbers.get(english[1].toLowerCase()) - 1,
        Number(english[2]),
      ),
    ).toISOString();
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
};

const appStoreUrlFor = (platform, appId, mappingUrl) =>
  mappingUrl ??
  (platform === "googlePlay"
    ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}`
    : null);

const matchesFilters = (record, input) => {
  if (
    Array.isArray(input.ratings) &&
    input.ratings.length > 0 &&
    !input.ratings.includes(Number(record.rating))
  )
    return false;
  const date = normalizeDate(record.reviewDateText);
  const range = input.dateRange ?? {};
  if (range.from && (!date || date < range.from)) return false;
  if (range.to && (!date || date > range.to)) return false;
  if (
    range.recentDays &&
    (!date ||
      Date.parse(date) < Date.now() - range.recentDays * 24 * 60 * 60 * 1000)
  )
    return false;
  return true;
};

const normalizeReply = (reply) => ({
  text: reply?.text ?? null,
  createdAt: normalizeDate(reply?.replyDateText),
});

const normalizeCollectedReview = ({
  product,
  platform,
  mapping,
  record,
  diagnostics,
  includeReviewText,
  includeDeveloperReplies,
}) => {
  const apple = platform === "appleAppStore";
  const reviewText = includeReviewText ? (record.text ?? "") : "";
  return {
    recordType: "review",
    product: {
      productId: product.productId,
      name: product.name,
      productType: product.productType,
    },
    platform: {
      id: platform,
      appId: mapping.appId,
      storeUrl: appStoreUrlFor(platform, mapping.appId, mapping.storeUrl),
    },
    review: {
      reviewId: String(record.reviewId),
      rating: Number.isFinite(Number(record.rating))
        ? Number(record.rating)
        : null,
      title: record.title ?? null,
      text: reviewText,
      sourceLanguage: record.source?.language ?? "unknown",
      countryCode: record.source?.country ?? null,
      createdAt: normalizeDate(record.reviewDateText),
      updatedAt: null,
      appVersion: record.appVersion ?? null,
      helpfulCount: record.helpfulCount ?? null,
    },
    developerReply:
      includeDeveloperReplies && !apple
        ? normalizeReply(record.developerReply)
        : { text: null, createdAt: null },
    environmentContext: {
      device: null,
      operatingSystem: apple ? "iOS" : "Android",
      authenticationMethod: null,
    },
    source: {
      sourceUrl: diagnostics.url ?? null,
      collectedAt: diagnostics.collectedAt ?? new Date().toISOString(),
    },
  };
};

export const collectMappedProductReviews = async ({
  input,
  collectors = defaultCollectors,
}) => {
  const reviews = [];
  const diagnostics = [];
  const errors = [];
  const seenReviews = new Set();
  const stats = {
    productsRequested: input.products.length,
    productsProcessed: 0,
    googlePlayReviewsCollected: 0,
    appleAppStoreReviewsCollected: 0,
    googlePlayRequests: 0,
    appleAppStoreRequests: 0,
    errors: 0,
  };

  for (const product of input.products) {
    for (const [platform, mapping] of Object.entries(product.platforms)) {
      for (const country of input.countries) {
        for (const language of input.languages) {
          const collector = collectors[platform];
          const requestStatsKey =
            platform === "googlePlay"
              ? "googlePlayRequests"
              : "appleAppStoreRequests";
          let collection;
          try {
            collection = await collector({
              appId: mapping.appId,
              country,
              language,
              maxReviewsPerApp: input.maxReviewsPerPlatform,
              requestTimeoutSecs: input.requestTimeoutSecs,
              maxPagesPerApp: input.maxPagesPerPlatform,
            });
          } catch (error) {
            collection = {
              records: [],
              diagnostics: { collectedAt: new Date().toISOString() },
              error: {
                code: error.code ?? "SOURCE_COLLECTION_ERROR",
                message: error.message,
              },
            };
          }
          const diagnostic = {
            productId: product.productId,
            platform,
            appId: mapping.appId,
            ...collection.diagnostics,
          };
          diagnostics.push(diagnostic);
          stats[requestStatsKey] += 1;
          for (const record of collection.records ?? []) {
            if (!matchesFilters(record, input)) continue;
            const key = `${product.productId}:${platform}:${record.reviewId}`;
            if (seenReviews.has(key)) continue;
            seenReviews.add(key);
            reviews.push(
              normalizeCollectedReview({
                product,
                platform,
                mapping,
                record,
                diagnostics: collection.diagnostics ?? {},
                includeReviewText: input.includeReviewText,
                includeDeveloperReplies: input.includeDeveloperReplies,
              }),
            );
            stats[
              platform === "googlePlay"
                ? "googlePlayReviewsCollected"
                : "appleAppStoreReviewsCollected"
            ] += 1;
          }
          if (collection.error) {
            errors.push({
              productId: product.productId,
              platform,
              appId: mapping.appId,
              error: collection.error,
            });
            stats.errors += 1;
          }
        }
      }
    }
    stats.productsProcessed += 1;
  }

  return { reviews, diagnostics, errors, stats };
};

export { matchesFilters, normalizeCollectedReview, normalizeDate };
