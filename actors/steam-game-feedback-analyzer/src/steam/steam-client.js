const REVIEW_FILTER_TO_API = { all: "all", positive: "positive", negative: "negative" };
const PURCHASE_TYPE_TO_API = {
  all: "all",
  steamPurchasers: "steam",
  nonSteamPurchasers: "non_steam_purchase",
};

const wait = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const isRetryableStatus = (status) => status === 408 || status === 425 || status === 429 || status >= 500;

const fetchJsonWithRetry = async ({ fetchImpl, sleep, url, maxAttempts = 3 }) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: {
          accept: "application/json",
          "user-agent": "steam-game-feedback-analyzer/0.1",
        },
      });
      if (!response.ok && !isRetryableStatus(response.status)) {
        throw new Error(`Steam returned HTTP ${response.status}.`);
      }
      if (!response.ok) throw new Error(`Steam returned HTTP ${response.status}.`);
      return await response.json();
    } catch (error) {
      lastError = error;
      const retryable = isRetryableStatus(error.status) || /HTTP (408|425|429|5\d\d)|fetch failed|timed out|network/i.test(error.message);
      if (!retryable || attempt === maxAttempts) throw error;
      await sleep(Math.min(2000, 250 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
};

export const buildReviewsUrl = ({
  appId,
  language = "all",
  reviewFilter = "all",
  purchaseType = "all",
  cursor = "*",
  numPerPage = 100,
}) => {
  const params = new URLSearchParams({
    json: "1",
    filter: "recent",
    language,
    review_type: REVIEW_FILTER_TO_API[reviewFilter] ?? "all",
    purchase_type: PURCHASE_TYPE_TO_API[purchaseType] ?? "all",
    num_per_page: String(Math.min(100, numPerPage)),
    cursor,
  });
  return `https://store.steampowered.com/appreviews/${encodeURIComponent(appId)}?${params}`;
};

export const isReviewInDateRange = (review, dateRange = {}) => {
  const timestamp = Number(review.timestamp_created);
  const hasDateBounds = Boolean(dateRange.from || dateRange.to || dateRange.recentDays);
  if (!Number.isFinite(timestamp)) return !hasDateBounds;
  const createdAt = timestamp * 1000;
  if (dateRange.from && createdAt < new Date(dateRange.from).getTime()) return false;
  if (dateRange.to && createdAt > new Date(dateRange.to).getTime()) return false;
  if (dateRange.recentDays) {
    const recentCutoff = Date.now() - dateRange.recentDays * 24 * 60 * 60 * 1000;
    if (createdAt < recentCutoff) return false;
  }
  return true;
};

const fetchReviewPage = async ({ fetchImpl, sleep, ...options }) => {
  const url = buildReviewsUrl(options);
  const body = await fetchJsonWithRetry({ fetchImpl, sleep, url });
  if (body.success !== 1) throw new Error("Steam review response reported success=0.");
  return body;
};

export const createSteamClient = ({ fetchImpl = globalThis.fetch, sleep = wait } = {}) => ({
  async getGameDetails(appId) {
    const url = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}&l=english`;
    const body = await fetchJsonWithRetry({ fetchImpl, sleep, url });
    const result = body[String(appId)];
    if (!result?.success || !result.data) throw new Error(`Steam app ${appId} was not found.`);
    return {
      steamAppId: Number(appId),
      name: result.data.name ?? `Steam app ${appId}`,
      storeUrl: `https://store.steampowered.com/app/${appId}/`,
    };
  },

  async fetchReviews({
    appId,
    languages = ["all"],
    reviewFilter = "all",
    purchaseType = "all",
    dateRange = {},
    maxReviews = 100,
  }) {
    const output = [];
    const seen = new Set();
    for (const language of languages) {
      let cursor = "*";
      const seenCursors = new Set();
      while (output.length < maxReviews) {
        if (seenCursors.has(cursor)) break;
        seenCursors.add(cursor);
        const page = await fetchReviewPage({
          fetchImpl,
          sleep,
          appId,
          language,
          reviewFilter,
          purchaseType,
          cursor,
          numPerPage: 100,
        });
        const reviews = Array.isArray(page.reviews) ? page.reviews : [];
        for (const review of reviews) {
          const reviewId = String(review.recommendationid ?? "");
          if (!reviewId || seen.has(reviewId) || !isReviewInDateRange(review, dateRange)) continue;
          seen.add(reviewId);
          output.push(review);
          if (output.length >= maxReviews) break;
        }
        if (output.length >= maxReviews || reviews.length === 0 || !page.cursor) break;
        cursor = page.cursor;
      }
    }
    return output;
  },
});
