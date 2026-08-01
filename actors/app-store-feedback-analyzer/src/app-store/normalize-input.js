const APP_ID_PATTERN = /^\d+$/;

const invalidInput = (message) => {
  const error = new Error(message);
  error.code = "APP_STORE_INVALID_INPUT";
  return error;
};

const boundedInteger = (value, fallback, minimum, maximum, name) => {
  const result = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw invalidInput(
      `${name} must be an integer between ${minimum} and ${maximum}`,
    );
  }
  return result;
};

export const parseAppStoreUrl = (value) => {
  let url;
  try {
    url = new URL(String(value));
  } catch {
    throw invalidInput("appStoreUrls contains an invalid URL");
  }
  const match = url.pathname.match(/(?:^|\/)id(\d+)(?:[/?#]|$)/i);
  if (!match)
    throw invalidInput("appStoreUrls must contain an Apple App Store id");
  return match[1];
};

export const normalizeInput = (input = {}) => {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw invalidInput("Actor input must be a JSON object");

  const ids = input.appIds ?? [];
  const urls = input.appStoreUrls ?? [];
  if (!Array.isArray(ids) || !Array.isArray(urls))
    throw invalidInput("appIds and appStoreUrls must be arrays");
  if (ids.length + urls.length < 1 || ids.length + urls.length > 20) {
    throw invalidInput(
      "appIds and appStoreUrls must contain between 1 and 20 values",
    );
  }
  const appIds = [
    ...new Set([
      ...ids.map((value) => String(value).trim()),
      ...urls.map(parseAppStoreUrl),
    ]),
  ];
  if (
    appIds.some((appId) => !APP_ID_PATTERN.test(appId) || Number(appId) <= 0)
  ) {
    throw invalidInput("appIds contains an invalid Apple App Store ID");
  }

  const country = String(input.country ?? "US")
    .trim()
    .toUpperCase();
  const language = String(input.language ?? "en")
    .trim()
    .toLowerCase();
  const mode = input.mode ?? "reviews";
  if (!["reviews", "releaseImpact"].includes(mode))
    throw invalidInput("mode must be reviews or releaseImpact");
  if (!/^[A-Z]{2}$/.test(country))
    throw invalidInput("country must be a two-letter ISO country code");
  if (!/^[a-z]{2,3}$/.test(language))
    throw invalidInput("language must be a two- or three-letter code");
  if (input.debug !== undefined && typeof input.debug !== "boolean")
    throw invalidInput("debug must be a boolean");

  const analysisInput = input.analysis ?? {};
  if (
    !analysisInput ||
    typeof analysisInput !== "object" ||
    Array.isArray(analysisInput)
  )
    throw invalidInput("analysis must be an object");
  const outputLanguage = analysisInput.outputLanguage ?? "english";
  if (!["english", "original"].includes(outputLanguage))
    throw invalidInput("analysis.outputLanguage must be english or original");

  const aggregationInput = input.aggregation ?? {};
  if (
    !aggregationInput ||
    typeof aggregationInput !== "object" ||
    Array.isArray(aggregationInput)
  )
    throw invalidInput("aggregation must be an object");

  let release = null;
  let daysBefore = null;
  let daysAfter = null;
  let maxReviewsPerPeriod = null;
  if (mode === "releaseImpact") {
    if (analysisInput.enabled === false)
      throw invalidInput(
        "analysis.enabled must be true for releaseImpact mode",
      );
    const releaseInput = input.release ?? {};
    if (
      !releaseInput ||
      typeof releaseInput !== "object" ||
      Array.isArray(releaseInput)
    )
      throw invalidInput("release must be an object for releaseImpact mode");
    if (
      !releaseInput.releasedAt ||
      !Number.isFinite(Date.parse(releaseInput.releasedAt))
    )
      throw invalidInput(
        "release.releasedAt is required and must be an ISO date-time",
      );
    release = {
      version:
        releaseInput.version === undefined || releaseInput.version === null
          ? null
          : String(releaseInput.version).trim() || null,
      releasedAt: new Date(Date.parse(releaseInput.releasedAt)).toISOString(),
    };
    daysBefore = boundedInteger(input.daysBefore, 14, 1, 365, "daysBefore");
    daysAfter = boundedInteger(input.daysAfter, 14, 1, 365, "daysAfter");
    maxReviewsPerPeriod = boundedInteger(
      input.maxReviewsPerPeriod,
      100,
      1,
      500,
      "maxReviewsPerPeriod",
    );
  }

  return {
    appIds,
    ...(mode === "releaseImpact"
      ? { mode, release, daysBefore, daysAfter, maxReviewsPerPeriod }
      : {}),
    country,
    language,
    maxReviewsPerApp: boundedInteger(
      input.maxReviewsPerApp,
      50,
      1,
      500,
      "maxReviewsPerApp",
    ),
    maxPagesPerApp: boundedInteger(
      input.maxPagesPerApp,
      10,
      1,
      10,
      "maxPagesPerApp",
    ),
    requestTimeoutSecs: boundedInteger(
      input.requestTimeoutSecs,
      30,
      5,
      120,
      "requestTimeoutSecs",
    ),
    debug: input.debug ?? false,
    analysis: {
      enabled: analysisInput.enabled ?? true,
      outputLanguage,
      maxAttempts: boundedInteger(
        analysisInput.maxAttempts,
        2,
        1,
        3,
        "analysis.maxAttempts",
      ),
    },
    aggregation: {
      enabled: aggregationInput.enabled ?? true,
      minimumClusterSize: boundedInteger(
        aggregationInput.minimumClusterSize,
        2,
        1,
        100,
        "aggregation.minimumClusterSize",
      ),
    },
  };
};
