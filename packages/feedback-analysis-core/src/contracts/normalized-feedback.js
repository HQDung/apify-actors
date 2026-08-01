import { ERROR_CODES } from "../errors/error-codes.js";

export const NORMALIZED_FEEDBACK_SCHEMA_VERSION = "1.0";

const assert = (condition, message) => {
  if (!condition) throw new Error(`${ERROR_CODES.INVALID_NORMALIZED_FEEDBACK}: ${message}`);
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const nullableString = (value, name) => assert(value === null || typeof value === "string", `${name} must be a string or null.`);

export const validateNormalizedFeedback = (feedback) => {
  assert(isObject(feedback), "feedback must be an object.");
  assert(isObject(feedback.source), "source must be an object.");
  assert(typeof feedback.source.platform === "string" && feedback.source.platform.trim() !== "", "source.platform is required.");
  assert(typeof feedback.source.sourceRecordId === "string" && feedback.source.sourceRecordId.trim() !== "", "source.sourceRecordId is required.");
  nullableString(feedback.source.sourceUrl ?? null, "source.sourceUrl");
  assert(typeof feedback.source.collectedAt === "string" && feedback.source.collectedAt.trim() !== "", "source.collectedAt is required.");

  assert(isObject(feedback.product), "product must be an object.");
  assert(typeof feedback.product.productType === "string" && feedback.product.productType.trim() !== "", "product.productType is required.");
  assert(typeof feedback.product.productId === "string" && feedback.product.productId.trim() !== "", "product.productId is required.");
  nullableString(feedback.product.name ?? null, "product.name");
  nullableString(feedback.product.version ?? null, "product.version");

  assert(isObject(feedback.feedback), "feedback.feedback must be an object.");
  assert(typeof feedback.feedback.text === "string", "feedback.text must be a string.");
  nullableString(feedback.feedback.title ?? null, "feedback.title");
  assert(typeof feedback.feedback.sourceLanguage === "string" && feedback.feedback.sourceLanguage.trim() !== "", "feedback.sourceLanguage is required.");
  nullableString(feedback.feedback.createdAt ?? null, "feedback.createdAt");
  nullableString(feedback.feedback.updatedAt ?? null, "feedback.updatedAt");
  assert(feedback.feedback.isPositive === null || typeof feedback.feedback.isPositive === "boolean", "feedback.isPositive must be boolean or null.");
  assert(feedback.feedback.rating === null || (Number.isFinite(feedback.feedback.rating) && feedback.feedback.rating >= 0), "feedback.rating must be a non-negative number or null.");

  if (feedback.authorContext !== undefined) assert(isObject(feedback.authorContext), "authorContext must be an object.");
  if (feedback.environmentContext !== undefined) assert(isObject(feedback.environmentContext), "environmentContext must be an object.");
  if (feedback.sourceMetadata !== undefined) assert(isObject(feedback.sourceMetadata), "sourceMetadata must be an object.");
  return feedback;
};
