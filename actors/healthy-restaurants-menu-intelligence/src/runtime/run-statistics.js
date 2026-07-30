export const RUN_STATISTIC_KEYS = [
  "searchJobs",
  "searchJobsFailed",
  "rawPlacesDiscovered",
  "restaurantsAfterDeduplication",
  "restaurantsProcessed",
  "websitesAvailable",
  "websitesReachable",
  "menuUrlsFound",
  "htmlMenusProcessed",
  "menusExtracted",
  "menusExtractedEmpty",
  "unsupportedMenus",
  "menuFailures",
  "rawMenuItems",
  "deduplicatedMenuItems",
  "itemsAfterLimits",
  "itemsWithDietaryTags",
  "itemsWithPublishedNutrition",
  "healthyFocusedRestaurants",
  "uncertainClassifications",
  "notHealthyFocusedRestaurants",
  "warnings",
  "errors",
  "resultsPushed",
];

const normalizeCount = (value) => Math.max(0, Math.floor(Number(value) || 0));

export const createRunStatistics = ({
  now = Date.now,
  startedAt = now(),
} = {}) => {
  const values = Object.fromEntries(RUN_STATISTIC_KEYS.map((key) => [key, 0]));

  return {
    increment(name, amount = 1) {
      if (!(name in values)) throw new Error(`Unknown run statistic: ${name}`);
      values[name] = normalizeCount(values[name] + amount);
    },
    set(name, value) {
      if (!(name in values)) throw new Error(`Unknown run statistic: ${name}`);
      values[name] = normalizeCount(value);
    },
    summary({ finishedAt = now() } = {}) {
      const runtimeMs = Math.max(0, Number(finishedAt) - Number(startedAt));
      return {
        ...values,
        runtimeSeconds: Math.round((runtimeMs / 1000) * 1000) / 1000,
      };
    },
  };
};
