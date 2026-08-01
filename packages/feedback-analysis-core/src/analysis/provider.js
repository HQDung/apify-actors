export const callAnalysisProvider = async ({ provider, ...context }) => {
  if (typeof provider === "function") return provider(context);
  if (provider && typeof provider.analyze === "function") return provider.analyze(context);
  throw new Error("ANALYSIS_FAILED: provider must be a function or an object with analyze().");
};
