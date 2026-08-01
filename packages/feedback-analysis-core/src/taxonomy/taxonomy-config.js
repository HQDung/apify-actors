import { COMMON_FEEDBACK_TYPES } from "./common-feedback-types.js";
import { COMMON_TOPICS } from "./common-topics.js";
import { DEFAULT_SEVERITY_RULES } from "./severity.js";

const unique = (values) => [...new Set(values)];

export const createTaxonomyConfig = ({ feedbackTypes = [], topics = [], severityRules = {}, promptContext = "" } = {}) => ({
  feedbackTypes: Object.freeze(unique([...COMMON_FEEDBACK_TYPES, ...feedbackTypes.map(String)])),
  topics: Object.freeze(unique([...COMMON_TOPICS, ...topics.map(String)])),
  severityRules: Object.freeze({ ...DEFAULT_SEVERITY_RULES, ...severityRules }),
  promptContext: String(promptContext),
});
