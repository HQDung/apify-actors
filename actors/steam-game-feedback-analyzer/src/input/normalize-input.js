import {
  DEFAULT_INPUT,
  SUPPORTED_MODES,
  SUPPORTED_PURCHASE_TYPES,
  SUPPORTED_REVIEW_FILTERS,
} from "../config/defaults.js";
import { mergeSteamAppIds } from "./extract-app-ids.js";

const assertIntegerInRange = (value, name, minimum, maximum) => {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
};

const normalizeDate = (value, name) => {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${name} must be a valid ISO date.`);
  return date.toISOString();
};

const normalizeLanguages = (languages) => {
  if (!Array.isArray(languages) || languages.length === 0) {
    throw new Error("languages must contain at least one Steam language code.");
  }
  const normalized = languages.map((language) => String(language).trim()).filter(Boolean);
  if (normalized.length !== languages.length || normalized.some((language) => !/^[a-z0-9_-]+$/i.test(language))) {
    throw new Error("languages must contain non-empty Steam language codes.");
  }
  if (normalized.includes("all")) return ["all"];
  return [...new Set(normalized)];
};

export const normalizeInput = (input = {}) => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Input must be an object.");
  }

  const startUrls = Array.isArray(input.startUrls) ? input.startUrls : [];
  const steamAppIds = mergeSteamAppIds(input.steamAppIds ?? DEFAULT_INPUT.steamAppIds, startUrls);
  if (steamAppIds.length === 0) {
    throw new Error("At least one valid Steam app ID or Steam Store URL is required in steamAppIds/startUrls.");
  }

  const mode = input.mode ?? DEFAULT_INPUT.mode;
  if (!SUPPORTED_MODES.includes(mode)) throw new Error(`mode must be one of: ${SUPPORTED_MODES.join(", ")}.`);
  const reviewFilter = input.reviewFilter ?? DEFAULT_INPUT.reviewFilter;
  if (!SUPPORTED_REVIEW_FILTERS.includes(reviewFilter)) {
    throw new Error(`reviewFilter must be one of: ${SUPPORTED_REVIEW_FILTERS.join(", ")}.`);
  }
  const purchaseType = input.purchaseType ?? DEFAULT_INPUT.purchaseType;
  if (!SUPPORTED_PURCHASE_TYPES.includes(purchaseType)) {
    throw new Error(`purchaseType must be one of: ${SUPPORTED_PURCHASE_TYPES.join(", ")}.`);
  }

  const dateRange = input.dateRange ?? {};
  const recentDaysValue = dateRange.recentDays ?? DEFAULT_INPUT.dateRange.recentDays;
  if (recentDaysValue !== null) assertIntegerInRange(recentDaysValue, "dateRange.recentDays", 0, 3650);
  const recentDays = recentDaysValue === 0 ? null : recentDaysValue;
  const from = normalizeDate(dateRange.from ?? DEFAULT_INPUT.dateRange.from, "dateRange.from");
  const to = normalizeDate(dateRange.to ?? DEFAULT_INPUT.dateRange.to, "dateRange.to");
  if (from && to && from > to) throw new Error("dateRange.from must be before dateRange.to.");

  const maxReviewsPerGame = input.maxReviewsPerGame ?? DEFAULT_INPUT.maxReviewsPerGame;
  assertIntegerInRange(maxReviewsPerGame, "maxReviewsPerGame", 1, 5000);

  const analysis = { ...DEFAULT_INPUT.analysis, ...(input.analysis ?? {}) };
  const aggregation = { ...DEFAULT_INPUT.aggregation, ...(input.aggregation ?? {}) };
  if (typeof analysis.enabled !== "boolean") throw new Error("analysis.enabled must be a boolean.");
  if (typeof aggregation.enabled !== "boolean") throw new Error("aggregation.enabled must be a boolean.");
  assertIntegerInRange(aggregation.minimumClusterSize, "aggregation.minimumClusterSize", 1, 100);
  assertIntegerInRange(aggregation.maxExamplesPerTopic, "aggregation.maxExamplesPerTopic", 0, 20);

  let patch = null;
  let daysBefore = null;
  let daysAfter = null;
  let maxReviewsPerPeriod = null;
  if (mode === "patchImpact") {
    const patchInput = input.patch ?? {};
    const releasedAt = normalizeDate(patchInput.releasedAt, "patch.releasedAt");
    if (!releasedAt) throw new Error("patch.releasedAt is required for patchImpact mode.");
    daysBefore = input.daysBefore ?? 14;
    daysAfter = input.daysAfter ?? 14;
    maxReviewsPerPeriod = input.maxReviewsPerPeriod ?? 1000;
    assertIntegerInRange(daysBefore, "daysBefore", 1, 365);
    assertIntegerInRange(daysAfter, "daysAfter", 1, 365);
    assertIntegerInRange(maxReviewsPerPeriod, "maxReviewsPerPeriod", 1, 5000);
    const notesUrl = patchInput.notesUrl ? String(patchInput.notesUrl) : null;
    if (notesUrl && !URL.canParse(notesUrl)) throw new Error("patch.notesUrl must be a valid URL.");
    patch = { releasedAt, version: patchInput.version ? String(patchInput.version) : null, notesUrl };
  }

  return {
    mode,
    steamAppIds,
    startUrls: startUrls.filter((entry) => entry && typeof entry.url === "string"),
    languages: normalizeLanguages(input.languages ?? DEFAULT_INPUT.languages),
    reviewFilter,
    purchaseType,
    dateRange: { from, to, recentDays },
    maxReviewsPerGame,
    includeReviewText: input.includeReviewText ?? DEFAULT_INPUT.includeReviewText,
    analysis,
    aggregation,
    ...(patch ? { patch, daysBefore, daysAfter, maxReviewsPerPeriod } : {}),
    proxyConfiguration: { ...DEFAULT_INPUT.proxyConfiguration, ...(input.proxyConfiguration ?? {}) },
    debug: input.debug ?? DEFAULT_INPUT.debug,
  };
};
