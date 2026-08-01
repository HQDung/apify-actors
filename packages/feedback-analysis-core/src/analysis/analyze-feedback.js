import { validateAnalysisResult } from "../contracts/analysis-result.js";
import { ERROR_CODES } from "../errors/error-codes.js";
import { fallbackAnalyzeFeedback } from "./fallback-analysis.js";
import { normalizeAnalysisConfidence } from "./normalize-confidence.js";
import { callAnalysisProvider } from "./provider.js";
import { parseAnalysisPayload } from "./parse-analysis.js";
import { buildAnalysisPrompt } from "./prompt.js";

const sourceLanguageFor = (feedback) => feedback?.feedback?.sourceLanguage ?? feedback?.sourceLanguage ?? "unknown";

const withAnalysisMetadata = (candidate, feedback, options) => ({
  analysisStatus: "success",
  ...normalizeAnalysisConfidence(candidate),
  sourceLanguage: candidate.sourceLanguage ?? sourceLanguageFor(feedback),
  analysisLanguage: options.outputLanguage ?? candidate.analysisLanguage ?? "english",
});

const failureResult = (error) => ({
  analysisStatus: "failed",
  analysisError: {
    code: error.message.startsWith(`${ERROR_CODES.ANALYSIS_SCHEMA_INVALID}:`)
      ? ERROR_CODES.ANALYSIS_SCHEMA_INVALID
      : ERROR_CODES.ANALYSIS_FAILED,
    message: error.message.replace(/^[A-Z_]+:\s*/, "").slice(0, 240),
  },
});

const analyzeWithProvider = async ({
  feedback,
  taxonomy,
  provider,
  fallback = fallbackAnalyzeFeedback,
  options = {},
  logger = {},
  usage,
}) => {
  const maxAttempts = Number.isInteger(options.maxAttempts) && options.maxAttempts > 0 ? options.maxAttempts : 2;
  const prompt = buildAnalysisPrompt({ feedback, taxonomy, options });
  let lastError = new Error(`${ERROR_CODES.ANALYSIS_FAILED}: provider did not return a valid result.`);

  if (provider) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      usage?.increment("providerAttempts");
      try {
        const payload = await callAnalysisProvider({ provider, feedback, taxonomy, options, prompt, logger });
        usage?.record(payload?.usage);
        const parsed = parseAnalysisPayload(payload?.result ?? payload?.output ?? payload);
        return validateAnalysisResult(withAnalysisMetadata(parsed, feedback, options), taxonomy);
      } catch (error) {
        lastError = error;
        usage?.increment("invalidResponses");
        if (attempt < maxAttempts) logger.warning?.(`Feedback analysis attempt ${attempt} failed: ${error.message}`);
      }
    }
  }

  try {
    usage?.increment("fallbackCount");
    return validateAnalysisResult(
      withAnalysisMetadata(await fallback({ feedback, taxonomy, options, error: lastError }), feedback, options),
      taxonomy,
    );
  } catch (error) {
    logger.warning?.(`Feedback analysis fallback failed: ${error.message}`);
    return failureResult(error);
  }
};

export const analyzeFeedback = (options) => {
  if (options.provider) return analyzeWithProvider(options);
  const {
    feedback,
    taxonomy,
    fallback = fallbackAnalyzeFeedback,
    options: analysisOptions = {},
    logger = {},
    usage,
  } = options;
  try {
    usage?.increment("fallbackCount");
    return validateAnalysisResult(
      withAnalysisMetadata(fallback({ feedback, taxonomy, options: analysisOptions }), feedback, analysisOptions),
      taxonomy,
    );
  } catch (error) {
    logger.warning?.(`Feedback analysis fallback failed: ${error.message}`);
    return failureResult(error);
  }
};
