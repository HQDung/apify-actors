import { ERROR_CODES } from "../errors/error-codes.js";

export const parseAnalysisPayload = (payload) => {
  let parsed = payload;
  if (typeof payload === "string") {
    try {
      parsed = JSON.parse(payload);
    } catch (error) {
      throw new Error(`${ERROR_CODES.ANALYSIS_SCHEMA_INVALID}: provider returned invalid JSON (${error.message}).`);
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${ERROR_CODES.ANALYSIS_SCHEMA_INVALID}: provider output must be an object.`);
  }
  return parsed;
};
