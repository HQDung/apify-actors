import {
  ANALYSIS_SCHEMA_VERSION,
  validateAnalysisResult,
} from "@project/feedback-analysis-core";

import { STEAM_TAXONOMY } from "../core/steam-contract-adapter.js";

export { ANALYSIS_SCHEMA_VERSION };

export const validateAnalysis = (analysis) => {
  validateAnalysisResult({ analysisStatus: "success", ...analysis }, STEAM_TAXONOMY);
  return analysis;
};
