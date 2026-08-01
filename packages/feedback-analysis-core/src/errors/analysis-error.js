import { ERROR_CODES } from "./error-codes.js";

export class AnalysisError extends Error {
  constructor(code = ERROR_CODES.ANALYSIS_FAILED, message = "Feedback analysis failed.", details = {}) {
    super(message);
    this.name = "AnalysisError";
    this.code = code;
    this.details = details;
  }
}
