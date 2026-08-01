export const PLATFORM_IDS = Object.freeze(["googlePlay", "appleAppStore"]);
export const COMPARISON_CLASSIFICATIONS = Object.freeze([
  "shared",
  "androidOnly",
  "iosOnly",
  "platformDominantAndroid",
  "platformDominantIos",
  "insufficientEvidence",
]);

const assert = (condition, code, message) => {
  if (!condition) throw new Error(`${code}: ${message}`);
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const string = (value, name, code) => assert(typeof value === "string" && value.trim() !== "", code, `${name} is required.`);
const nullableString = (value, name, code) => assert(value === null || value === undefined || typeof value === "string", code, `${name} must be a string or null.`);
const boundedConfidence = (value, name, code) => assert(Number.isFinite(value) && value >= 0 && value <= 1, code, `${name} must be between 0 and 1.`);
const positiveInteger = (value, name, code) => assert(Number.isInteger(value) && value >= 1, code, `${name} must be a positive integer.`);
const stringArray = (value, name, code) => assert(Array.isArray(value) && value.every((entry) => typeof entry === "string"), code, `${name} must be a string array.`);
const warningArray = (value, code) => assert(Array.isArray(value) && value.every((warning) => isObject(warning) && typeof warning.code === "string" && typeof warning.message === "string"), code, "warnings must contain code/message objects.");

const platformMapping = (value, platform) => {
  assert(isObject(value), "INVALID_PRODUCT_MAPPING", `${platform} mapping must be an object.`);
  string(value.appId, `${platform}.appId`, "INVALID_PRODUCT_MAPPING");
  nullableString(value.storeUrl, `${platform}.storeUrl`, "INVALID_PRODUCT_MAPPING");
  return value;
};

export const validateProductMapping = (product, { requireBothPlatforms = false } = {}) => {
  assert(isObject(product), "INVALID_PRODUCT_MAPPING", "product mapping must be an object.");
  assert(typeof product.productId === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(product.productId), "INVALID_PRODUCT_MAPPING", "productId must be a stable identifier without spaces.");
  nullableString(product.name, "name", "INVALID_PRODUCT_MAPPING");
  if (product.productType !== undefined) assert(product.productType === "mobileApp", "INVALID_PRODUCT_MAPPING", "productType must be mobileApp.");
  assert(isObject(product.platforms), "INVALID_PRODUCT_MAPPING", "platforms is required.");
  const present = PLATFORM_IDS.filter((platform) => product.platforms[platform] !== undefined).map((platform) => [platform, platformMapping(product.platforms[platform], platform)]);
  assert(present.length >= 1, "INVALID_PRODUCT_MAPPING", "at least one platform mapping is required.");
  if (requireBothPlatforms) assert(present.length === PLATFORM_IDS.length, "MISSING_PLATFORM_FOR_COMPARISON", "both Google Play and Apple App Store mappings are required.");
  return product;
};

const normalizedIssue = (issue, { specific = false } = {}) => {
  const code = specific ? "INSUFFICIENT_CROSS_PLATFORM_DATA" : "INVALID_CROSS_PLATFORM_COMPARISON";
  string(issue.comparisonId, "comparisonId", code);
  string(issue.canonicalIssue, "canonicalIssue", code);
  string(issue.feedbackType, "feedbackType", code);
  stringArray(issue.topics, "topics", code);
  string(issue.severity, "severity", code);
  positiveInteger(issue.mentionCount, "mentionCount", code);
  boundedConfidence(issue.comparisonConfidence, "comparisonConfidence", code);
  assert(issue.observedOnlyInCollectedSample === true, "INSUFFICIENT_CROSS_PLATFORM_DATA", "platform-specific findings must be explicitly limited to the collected sample.");
  assert(["sufficient", "limited"].includes(issue.evidenceStatus), code, "evidenceStatus must be sufficient or limited.");
  warningArray(issue.warnings, code);
  return issue;
};

export const validateSharedIssue = (issue) => {
  assert(isObject(issue), "INSUFFICIENT_CROSS_PLATFORM_DATA", "shared issue must be an object.");
  assert(issue.classification === "shared", "INSUFFICIENT_CROSS_PLATFORM_DATA", "shared issue classification is required.");
  string(issue.comparisonId, "comparisonId", "INSUFFICIENT_CROSS_PLATFORM_DATA");
  string(issue.canonicalIssue, "canonicalIssue", "INSUFFICIENT_CROSS_PLATFORM_DATA");
  string(issue.feedbackType, "feedbackType", "INSUFFICIENT_CROSS_PLATFORM_DATA");
  stringArray(issue.topics, "topics", "INSUFFICIENT_CROSS_PLATFORM_DATA");
  string(issue.severity, "severity", "INSUFFICIENT_CROSS_PLATFORM_DATA");
  string(issue.androidClusterId, "androidClusterId", "INSUFFICIENT_CROSS_PLATFORM_DATA");
  string(issue.iosClusterId, "iosClusterId", "INSUFFICIENT_CROSS_PLATFORM_DATA");
  positiveInteger(issue.androidMentions, "androidMentions", "INSUFFICIENT_CROSS_PLATFORM_DATA");
  positiveInteger(issue.iosMentions, "iosMentions", "INSUFFICIENT_CROSS_PLATFORM_DATA");
  boundedConfidence(issue.sharedConfidence, "sharedConfidence", "INSUFFICIENT_CROSS_PLATFORM_DATA");
  stringArray(issue.reasons, "reasons", "INSUFFICIENT_CROSS_PLATFORM_DATA");
  warningArray(issue.warnings, "INSUFFICIENT_CROSS_PLATFORM_DATA");
  return issue;
};

export const validatePlatformSpecificIssue = (issue) => {
  assert(isObject(issue), "INSUFFICIENT_CROSS_PLATFORM_DATA", "platform-specific issue must be an object.");
  assert(["androidOnly", "iosOnly", "platformDominantAndroid", "platformDominantIos"].includes(issue.classification), "INSUFFICIENT_CROSS_PLATFORM_DATA", "platform-specific classification is invalid.");
  assert(["android", "ios"].includes(issue.platform), "INSUFFICIENT_CROSS_PLATFORM_DATA", "platform must be android or ios.");
  if (issue.classification === "androidOnly" || issue.classification === "platformDominantAndroid") assert(issue.platform === "android", "INSUFFICIENT_CROSS_PLATFORM_DATA", "Android classification must use android platform.");
  if (issue.classification === "iosOnly" || issue.classification === "platformDominantIos") assert(issue.platform === "ios", "INSUFFICIENT_CROSS_PLATFORM_DATA", "iOS classification must use ios platform.");
  return normalizedIssue(issue, { specific: true });
};

export const createComparisonId = ({ productId, classification, canonicalIssue }) => [productId, classification, canonicalIssue].map((value) => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")).filter(Boolean).join("-");

const validateComparisonBase = (comparison) => {
  assert(isObject(comparison), "INVALID_CROSS_PLATFORM_COMPARISON", "comparison must be an object.");
  assert(comparison.recordType === "crossPlatformComparison", "INVALID_CROSS_PLATFORM_COMPARISON", "recordType must be crossPlatformComparison.");
  validateProductMapping(comparison.product, { requireBothPlatforms: true });
  assert(COMPARISON_CLASSIFICATIONS.includes(comparison.classification), "INVALID_CROSS_PLATFORM_COMPARISON", "classification is invalid.");
  return comparison;
};

export const validateCrossPlatformComparison = (comparison) => {
  const value = validateComparisonBase(comparison);
  try {
    if (value.classification === "shared") validateSharedIssue(value);
    else if (value.classification !== "insufficientEvidence") validatePlatformSpecificIssue(value);
    else {
      string(value.comparisonId, "comparisonId", "INSUFFICIENT_CROSS_PLATFORM_DATA");
      warningArray(value.warnings, "INSUFFICIENT_CROSS_PLATFORM_DATA");
      assert(value.warnings.length > 0, "INSUFFICIENT_CROSS_PLATFORM_DATA", "insufficient evidence requires a warning.");
    }
  } catch (error) {
    if (error.message.startsWith("INVALID_CROSS_PLATFORM_COMPARISON:")) throw error;
    throw new Error(`INVALID_CROSS_PLATFORM_COMPARISON: ${error.message.replace(/^[A-Z_]+:\s*/, "")}`);
  }
  return value;
};

const validateReviewWindow = (window) => {
  assert(isObject(window), "INVALID_CROSS_PLATFORM_REPORT", "reviewWindow is required.");
  nullableString(window.from, "reviewWindow.from", "INVALID_CROSS_PLATFORM_REPORT");
  nullableString(window.to, "reviewWindow.to", "INVALID_CROSS_PLATFORM_REPORT");
};

export const validateCrossPlatformFeedbackReport = (report) => {
  assert(isObject(report), "INVALID_CROSS_PLATFORM_REPORT", "report must be an object.");
  assert(report.recordType === "crossPlatformFeedbackReport", "INVALID_CROSS_PLATFORM_REPORT", "recordType must be crossPlatformFeedbackReport.");
  validateProductMapping(report.product);
  validateReviewWindow(report.reviewWindow);
  assert(isObject(report.statistics), "INVALID_CROSS_PLATFORM_REPORT", "statistics is required.");
  for (const field of ["googlePlayReviewsCollected", "appleAppStoreReviewsCollected", "googlePlayActionableReviews", "appleAppStoreActionableReviews"]) positiveInteger(report.statistics[field] + 1, field, "INVALID_CROSS_PLATFORM_REPORT");
  for (const field of ["googlePlayAverageRating", "appleAppStoreAverageRating"]) assert(report.statistics[field] === null || Number.isFinite(report.statistics[field]), "INVALID_CROSS_PLATFORM_REPORT", `${field} must be a number or null.`);
  for (const field of ["sharedIssues", "androidOnlyIssues", "iosOnlyIssues", "sharedFeatureRequests", "countryInsights", "languageInsights", "versionInsights"]) assert(Array.isArray(report[field]), "INVALID_CROSS_PLATFORM_REPORT", `${field} must be an array.`);
  for (const issue of report.sharedIssues) validateSharedIssue(issue);
  for (const issue of [...report.androidOnlyIssues, ...report.iosOnlyIssues]) validatePlatformSpecificIssue(issue);
  warningArray(report.warnings, "INVALID_CROSS_PLATFORM_REPORT");
  if (report.statistics.googlePlayReviewsCollected === 0) assert(report.warnings.some((warning) => warning.code === "INSUFFICIENT_CROSS_PLATFORM_DATA" && ["googlePlay", "android"].includes(warning.platform)), "INSUFFICIENT_CROSS_PLATFORM_DATA", "missing Google Play data requires a warning.");
  if (report.statistics.appleAppStoreReviewsCollected === 0) assert(report.warnings.some((warning) => warning.code === "INSUFFICIENT_CROSS_PLATFORM_DATA" && ["appleAppStore", "ios"].includes(warning.platform)), "INSUFFICIENT_CROSS_PLATFORM_DATA", "missing Apple App Store data requires a warning.");
  string(report.generatedAt, "generatedAt", "INVALID_CROSS_PLATFORM_REPORT");
  return report;
};
