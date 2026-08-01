export const buildAnalysisPrompt = ({ feedback, taxonomy, options = {} }) => {
  const sourceLanguage = feedback?.feedback?.sourceLanguage ?? feedback?.sourceLanguage ?? "unknown";
  const text = feedback?.feedback?.text ?? feedback?.text ?? "";
  return [
    "Analyze this user feedback as a reported product experience.",
    "Do not claim that a bug or regression is confirmed.",
    `Source language: ${sourceLanguage}`,
    `Output language: ${options.outputLanguage ?? "english"}`,
    `Allowed feedback types: ${taxonomy.feedbackTypes.join(", ")}`,
    `Allowed topics: ${taxonomy.topics.join(", ")}`,
    taxonomy.promptContext ? `Product context: ${taxonomy.promptContext}` : "",
    `Feedback text: ${text}`,
    "Return only a JSON object matching the configured analysis schema.",
  ].filter(Boolean).join("\n");
};
