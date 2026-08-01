export const severities = Object.freeze(["critical", "high", "medium", "low", "unknown"]);

export const DEFAULT_SEVERITY_RULES = Object.freeze({
  critical: "Possible launch, save, account, or progression blocker.",
  high: "Major reported impact on a core workflow.",
  medium: "Meaningful but non-blocking reported issue.",
  low: "Minor issue, suggestion, or low-impact complaint.",
  unknown: "Insufficient context for a reliable severity estimate.",
});
