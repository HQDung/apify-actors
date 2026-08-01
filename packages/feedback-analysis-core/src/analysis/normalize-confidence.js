const clamp = (value) => Math.min(1, Math.max(0, Number(value)));

export const normalizeConfidence = (value, fallback = 0) => {
  if (!Number.isFinite(Number(value))) return fallback;
  return Number(clamp(value).toFixed(2));
};

export const normalizeAnalysisConfidence = (analysis) => ({
  ...analysis,
  actionabilityScore: normalizeConfidence(analysis.actionabilityScore),
  ...(analysis.issue
    ? { issue: { ...analysis.issue, reproductionConfidence: normalizeConfidence(analysis.issue.reproductionConfidence) } }
    : {}),
});
