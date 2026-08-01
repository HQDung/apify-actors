import { parseAppStoreReviews } from "./parse-rss-json.js";

const userAgent = "Mozilla/5.0 (compatible; AppStoreFeedbackAnalyzer/0.1)";

const errorCodeFor = (error) => {
  if (error.name === "AbortError") return "APP_STORE_TIMEOUT";
  if (error.message.startsWith("APP_STORE_INVALID_RESPONSE"))
    return "APP_STORE_INVALID_RESPONSE";
  return "APP_STORE_FETCH_ERROR";
};

const urlFor = ({ appId, country, language, page }) => {
  const url = new URL(
    `https://itunes.apple.com/${country.toLowerCase()}/rss/customerreviews/id=${appId}/sortby=mostrecent/page=${page}/json`,
  );
  url.searchParams.set("l", language);
  return url;
};

const diagnostic = ({
  appId,
  country,
  language,
  url,
  collectedAt,
  pagesFetched,
  parsedReviewCount,
  status,
  responseBytes,
}) => ({
  appId,
  country,
  language,
  url,
  httpStatus: status,
  responseBytes,
  collectedAt,
  pagesFetched,
  parsedReviewCount,
  collectionMode: "rss-json",
});

export const collectAppStoreReviews = async ({
  appId,
  country,
  language,
  maxReviewsPerApp,
  maxPagesPerApp = 10,
  fetchImpl = globalThis.fetch,
  requestTimeoutSecs = 30,
}) => {
  const collectedAt = new Date().toISOString();
  const records = [];
  const seenIds = new Set();
  let pagesFetched = 0;
  let parsedReviewCount = 0;
  let lastDetails = diagnostic({
    appId,
    country,
    language,
    url: urlFor({ appId, country, language, page: 1 }).toString(),
    collectedAt,
    pagesFetched,
    parsedReviewCount,
    status: null,
    responseBytes: 0,
  });

  for (
    let page = 1;
    page <= maxPagesPerApp && records.length < maxReviewsPerApp;
    page += 1
  ) {
    const url = urlFor({ appId, country, language, page });
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      requestTimeoutSecs * 1000,
    );
    try {
      const response = await fetchImpl(url, {
        headers: { accept: "application/json", "user-agent": userAgent },
        signal: controller.signal,
      });
      const body = await response.text();
      pagesFetched += 1;
      lastDetails = diagnostic({
        appId,
        country,
        language,
        url: url.toString(),
        collectedAt,
        pagesFetched,
        parsedReviewCount,
        status: response.status,
        responseBytes: Buffer.byteLength(body),
      });
      if (!response.ok) {
        return {
          records: records.slice(0, maxReviewsPerApp),
          diagnostics: lastDetails,
          error: {
            code: "APP_STORE_HTTP_ERROR",
            message: `Apple App Store returned HTTP ${response.status}`,
            httpStatus: response.status,
          },
        };
      }
      const pageRecords = parseAppStoreReviews(body, {
        appId,
        country,
        language,
      });
      parsedReviewCount += pageRecords.length;
      lastDetails.parsedReviewCount = parsedReviewCount;
      for (const record of pageRecords) {
        if (seenIds.has(record.reviewId)) continue;
        seenIds.add(record.reviewId);
        records.push(record);
        if (records.length >= maxReviewsPerApp) break;
      }
      if (pageRecords.length === 0) break;
    } catch (error) {
      return {
        records: records.slice(0, maxReviewsPerApp),
        diagnostics: { ...lastDetails, pagesFetched, parsedReviewCount },
        error: {
          code: errorCodeFor(error),
          message: error.message,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    records: records.slice(0, maxReviewsPerApp),
    diagnostics: { ...lastDetails, pagesFetched, parsedReviewCount },
  };
};

export { urlFor };
