import { ERROR_CODES } from "../errors/error-codes.js";

const assert = (condition, message) => {
  if (!condition) throw new Error(`${ERROR_CODES.AGGREGATION_FAILED}: ${message}`);
};

export const validateAggregateReport = (report) => {
  assert(report && typeof report === "object" && !Array.isArray(report), "report must be an object.");
  assert(typeof report.productId === "string" && report.productId.trim() !== "", "productId is required.");
  assert(report.statistics && typeof report.statistics === "object", "statistics is required.");
  for (const field of ["reviewsCollected", "reviewsAnalyzed", "actionableReviews"]) {
    assert(Number.isInteger(report.statistics[field]) && report.statistics[field] >= 0, `${field} must be a non-negative integer.`);
  }
  return report;
};
