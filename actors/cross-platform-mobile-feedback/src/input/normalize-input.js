import { validateProductMapping } from "@project/cross-platform-comparison-core";

const MODES = new Set([
  "rawReviews",
  "feedbackAnalysis",
  "comparePlatforms",
  "releaseComparison",
]);
const GOOGLE_PLAY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]+$/;
const APP_STORE_ID_PATTERN = /^\d+$/;
const ANALYSIS_OUTPUT_LANGUAGES = new Set(["english", "original"]);

const invalid = (code, message) => {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  return error;
};

const parseUrl = (value, code, extractor) => {
  let url;
  try {
    url = new URL(String(value));
  } catch {
    throw invalid(code, "URL is invalid");
  }
  const appId = extractor(url);
  if (!appId)
    throw invalid(code, "URL does not contain a valid platform app ID");
  return { appId, storeUrl: url.toString() };
};

export const parseGooglePlayUrl = (value) =>
  parseUrl(value, "INVALID_GOOGLE_PLAY_ID", (url) =>
    url.searchParams.get("id"),
  );
export const parseAppleAppStoreUrl = (value) =>
  parseUrl(
    value,
    "INVALID_APP_STORE_ID",
    (url) => url.pathname.match(/(?:^|\/)id(\d+)(?:[/?#]|$)/i)?.[1],
  );

const googleMapping = (product) => {
  if (
    product.googlePlayAppId !== undefined &&
    product.googlePlayAppId !== null &&
    String(product.googlePlayAppId).trim()
  ) {
    const appId = String(product.googlePlayAppId).trim();
    if (!GOOGLE_PLAY_ID_PATTERN.test(appId))
      throw invalid("INVALID_GOOGLE_PLAY_ID", "googlePlayAppId is invalid");
    return product.googlePlayUrl
      ? { appId, storeUrl: String(product.googlePlayUrl) }
      : { appId, storeUrl: null };
  }
  if (product.googlePlayUrl) {
    const parsed = parseGooglePlayUrl(product.googlePlayUrl);
    if (!GOOGLE_PLAY_ID_PATTERN.test(parsed.appId))
      throw invalid(
        "INVALID_GOOGLE_PLAY_ID",
        "Google Play URL contains an invalid package ID",
      );
    return parsed;
  }
  return undefined;
};

const appleMapping = (product) => {
  if (
    product.appleAppId !== undefined &&
    product.appleAppId !== null &&
    String(product.appleAppId).trim()
  ) {
    const appId = String(product.appleAppId).trim();
    if (!APP_STORE_ID_PATTERN.test(appId) || Number(appId) <= 0)
      throw invalid("INVALID_APP_STORE_ID", "appleAppId is invalid");
    return product.appleAppStoreUrl
      ? { appId, storeUrl: String(product.appleAppStoreUrl) }
      : { appId, storeUrl: null };
  }
  if (product.appleAppStoreUrl)
    return parseAppleAppStoreUrl(product.appleAppStoreUrl);
  return undefined;
};

const normalizeRelease = (release, platform) => {
  if (release === undefined || release === null) return null;
  if (typeof release !== "object" || Array.isArray(release))
    throw invalid(
      "INVALID_RELEASE_COMPARISON",
      `${platform} release must be an object`,
    );
  if (!release.releasedAt || !Number.isFinite(Date.parse(release.releasedAt)))
    throw invalid(
      "INVALID_RELEASE_COMPARISON",
      `${platform}.releasedAt must be an ISO date-time`,
    );
  return {
    version:
      release.version === undefined || release.version === null
        ? null
        : String(release.version).trim() || null,
    releasedAt: new Date(Date.parse(release.releasedAt)).toISOString(),
  };
};

const normalizeCodeList = (value, fallback, pattern, name, transform) => {
  const values = value === undefined ? fallback : value;
  if (!Array.isArray(values) || values.length < 1 || values.length > 50)
    throw invalid(
      "INVALID_INPUT",
      `${name} must contain between 1 and 50 values`,
    );
  const normalized = [
    ...new Set(values.map((entry) => transform(String(entry).trim()))),
  ];
  if (normalized.some((entry) => !pattern.test(entry)))
    throw invalid("INVALID_INPUT", `${name} contains an invalid value`);
  return normalized;
};

const bounded = (value, fallback, minimum, maximum, name) => {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum)
    throw invalid(
      "INVALID_INPUT",
      `${name} must be an integer between ${minimum} and ${maximum}`,
    );
  return number;
};

const booleanOrDefault = (value, fallback, name) => {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean")
    throw invalid("INVALID_INPUT", `${name} must be a boolean`);
  return value;
};

const normalizeDateRange = (input) => {
  const value = input ?? {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalid("INVALID_INPUT", "dateRange must be an object");
  const date = (candidate, name) => {
    if (
      candidate === undefined ||
      candidate === null ||
      !String(candidate).trim()
    )
      return null;
    const time = Date.parse(candidate);
    if (!Number.isFinite(time))
      throw invalid("INVALID_INPUT", `${name} must be an ISO date-time`);
    return new Date(time).toISOString();
  };
  return {
    from: date(value.from, "dateRange.from"),
    to: date(value.to, "dateRange.to"),
    recentDays:
      value.recentDays === undefined || value.recentDays === null
        ? null
        : bounded(value.recentDays, 30, 1, 365, "dateRange.recentDays"),
  };
};

const normalizeProduct = (product, mode) => {
  if (!product || typeof product !== "object" || Array.isArray(product))
    throw invalid("INVALID_PRODUCT_MAPPING", "each product must be an object");
  const mapping = {
    productId: String(product.productId ?? "").trim(),
    name:
      product.name === undefined || product.name === null
        ? null
        : String(product.name).trim() || null,
    productType: "mobileApp",
    platforms: {
      ...(googleMapping(product) ? { googlePlay: googleMapping(product) } : {}),
      ...(appleMapping(product)
        ? { appleAppStore: appleMapping(product) }
        : {}),
    },
    releases: {
      android: normalizeRelease(product.releases?.android, "android"),
      ios: normalizeRelease(product.releases?.ios, "ios"),
    },
  };
  try {
    validateProductMapping(mapping, {
      requireBothPlatforms: ["comparePlatforms", "releaseComparison"].includes(
        mode,
      ),
    });
  } catch (error) {
    if (error.message.startsWith("MISSING_PLATFORM_FOR_COMPARISON"))
      throw error;
    throw invalid(
      "INVALID_PRODUCT_MAPPING",
      error.message.replace(/^[A-Z_]+:\s*/, ""),
    );
  }
  if (
    mode === "releaseComparison" &&
    (!mapping.releases.android || !mapping.releases.ios)
  )
    throw invalid(
      "INVALID_RELEASE_COMPARISON",
      "android and ios releases are required",
    );
  return mapping;
};

export const normalizeInput = (input = {}) => {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw invalid("INVALID_INPUT", "Actor input must be an object");
  const mode = input.mode ?? "rawReviews";
  if (!MODES.has(mode))
    throw invalid(
      "UNSUPPORTED_MODE",
      `mode must be one of: ${[...MODES].join(", ")}`,
    );
  if (
    !Array.isArray(input.products) ||
    input.products.length < 1 ||
    input.products.length > 50
  )
    throw invalid(
      "INVALID_INPUT",
      "products must contain between 1 and 50 products",
    );

  const products = input.products.map((product) =>
    normalizeProduct(product, mode),
  );
  const seen = new Map();
  for (const product of products) {
    for (const [platform, mapping] of Object.entries(product.platforms)) {
      const key = `${platform}:${mapping.appId}`;
      const previous = seen.get(key);
      if (previous && previous !== product.productId)
        throw invalid(
          "DUPLICATE_PLATFORM_APP",
          `${mapping.appId} is assigned to both ${previous} and ${product.productId}`,
        );
      seen.set(key, product.productId);
    }
  }

  const ratings = input.ratings === undefined ? [1, 2, 3, 4, 5] : input.ratings;
  if (
    !Array.isArray(ratings) ||
    ratings.some(
      (rating) => !Number.isInteger(rating) || rating < 1 || rating > 5,
    )
  )
    throw invalid("INVALID_INPUT", "ratings must contain integers from 1 to 5");
  if (mode === "releaseComparison" && input.analysis?.enabled === false)
    throw invalid(
      "INVALID_INPUT",
      "analysis.enabled must be true for releaseComparison",
    );

  const analysisInput = input.analysis ?? {};
  const outputLanguage = analysisInput.outputLanguage ?? "english";
  if (!ANALYSIS_OUTPUT_LANGUAGES.has(outputLanguage))
    throw invalid(
      "INVALID_INPUT",
      `analysis.outputLanguage must be one of: ${[...ANALYSIS_OUTPUT_LANGUAGES].join(", ")}`,
    );

  return {
    mode,
    products,
    countries: normalizeCodeList(
      input.countries,
      ["US"],
      /^[A-Z]{2}$/,
      "countries",
      (value) => value.toUpperCase(),
    ),
    languages: normalizeCodeList(
      input.languages,
      ["en"],
      /^[a-z]{2,3}$/,
      "languages",
      (value) => value.toLowerCase(),
    ),
    ratings: [...new Set(ratings)],
    dateRange: normalizeDateRange(input.dateRange),
    maxReviewsPerPlatform: bounded(
      input.maxReviewsPerPlatform,
      500,
      1,
      5000,
      "maxReviewsPerPlatform",
    ),
    requestTimeoutSecs: bounded(
      input.requestTimeoutSecs,
      30,
      1,
      120,
      "requestTimeoutSecs",
    ),
    maxPagesPerPlatform: bounded(
      input.maxPagesPerPlatform,
      10,
      1,
      50,
      "maxPagesPerPlatform",
    ),
    includeDeveloperReplies: booleanOrDefault(
      input.includeDeveloperReplies,
      true,
      "includeDeveloperReplies",
    ),
    includeReviewText: booleanOrDefault(
      input.includeReviewText,
      true,
      "includeReviewText",
    ),
    analysis: {
      enabled: booleanOrDefault(
        input.analysis?.enabled,
        true,
        "analysis.enabled",
      ),
      outputLanguage,
      maxAttempts: bounded(
        analysisInput.maxAttempts,
        2,
        1,
        3,
        "analysis.maxAttempts",
      ),
      maxReviewsToAnalyze: bounded(
        analysisInput.maxReviewsToAnalyze,
        1000,
        1,
        5000,
        "analysis.maxReviewsToAnalyze",
      ),
      cacheMaxEntries: bounded(
        analysisInput.cacheMaxEntries,
        1000,
        1,
        5000,
        "analysis.cacheMaxEntries",
      ),
      includeSummary: booleanOrDefault(
        input.analysis?.includeSummary,
        true,
        "analysis.includeSummary",
      ),
      includeTopics: booleanOrDefault(
        input.analysis?.includeTopics,
        true,
        "analysis.includeTopics",
      ),
      includeSeverity: booleanOrDefault(
        input.analysis?.includeSeverity,
        true,
        "analysis.includeSeverity",
      ),
      includeActionabilityScore: booleanOrDefault(
        input.analysis?.includeActionabilityScore,
        true,
        "analysis.includeActionabilityScore",
      ),
      includeEnvironmentSignals: booleanOrDefault(
        input.analysis?.includeEnvironmentSignals,
        true,
        "analysis.includeEnvironmentSignals",
      ),
      clusterSimilarIssues: booleanOrDefault(
        input.analysis?.clusterSimilarIssues,
        true,
        "analysis.clusterSimilarIssues",
      ),
    },
    comparison: {
      enabled: booleanOrDefault(
        input.comparison?.enabled,
        mode === "comparePlatforms",
        "comparison.enabled",
      ),
      minimumSharedClusterConfidence: Number(
        input.comparison?.minimumSharedClusterConfidence ?? 0.75,
      ),
      minimumPlatformSpecificMentions: bounded(
        input.comparison?.minimumPlatformSpecificMentions,
        2,
        1,
        1000,
        "comparison.minimumPlatformSpecificMentions",
      ),
      includeCountryComparison: booleanOrDefault(
        input.comparison?.includeCountryComparison,
        true,
        "comparison.includeCountryComparison",
      ),
      includeLanguageComparison: booleanOrDefault(
        input.comparison?.includeLanguageComparison,
        true,
        "comparison.includeLanguageComparison",
      ),
      includeVersionComparison: booleanOrDefault(
        input.comparison?.includeVersionComparison,
        true,
        "comparison.includeVersionComparison",
      ),
    },
    aggregation: {
      enabled: booleanOrDefault(
        input.aggregation?.enabled,
        true,
        "aggregation.enabled",
      ),
      minimumClusterSize: bounded(
        input.aggregation?.minimumClusterSize,
        2,
        1,
        1000,
        "aggregation.minimumClusterSize",
      ),
      maxExampleReviewsPerCluster: bounded(
        input.aggregation?.maxExampleReviewsPerCluster,
        3,
        1,
        20,
        "aggregation.maxExampleReviewsPerCluster",
      ),
    },
    daysBefore: bounded(input.daysBefore, 14, 1, 365, "daysBefore"),
    daysAfter: bounded(input.daysAfter, 14, 1, 365, "daysAfter"),
    debug: booleanOrDefault(input.debug, false, "debug"),
  };
};
