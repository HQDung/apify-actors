import { validateAnalysis } from "./analysis-schema.js";
import { fallbackAnalyzeReview } from "./fallback-analysis.js";

export const analyzeReview = (review) => validateAnalysis(fallbackAnalyzeReview(review));
