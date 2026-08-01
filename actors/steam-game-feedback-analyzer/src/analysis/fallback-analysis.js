import { feedbackTypes, topicIds } from "../config/taxonomy.js";

const topicRules = [
  { topic: "crashes", terms: ["crash", "crashes", "crashing", "crashed"] },
  { topic: "freezes", terms: ["freeze", "freezes", "freezing", "frozen", "bị treo", "đóng băng", "treo"] },
  { topic: "stuttering", terms: ["stutter", "stutters", "stuttering", "giật"] },
  { topic: "frameRate", terms: ["frame rate", "frame-rate", "fps", "frames per second"] },
  { topic: "loadingTime", terms: ["loading", "load time", "loading time", "tải"] },
  { topic: "disconnects", terms: ["disconnect", "disconnects", "disconnected", "mất kết nối"] },
  { topic: "matchmaking", terms: ["matchmaking", "match making"] },
  { topic: "saveSystem", terms: ["save", "saving", "save system", "progress lost", "lưu"] },
  { topic: "combat", terms: ["combat", "fighting", "fight", "chiến đấu"] },
  { topic: "inventory", terms: ["inventory", "backpack", "items", "kho đồ", "túi đồ"] },
  { topic: "controllerSupport", terms: ["controller", "gamepad", "right trigger", "tay cầm"] },
  { topic: "steamDeck", terms: ["steam deck", "steamdeck"] },
  { topic: "localization", terms: ["translation", "translated", "untranslated", "localization", "dịch", "tiếng việt"] },
  { topic: "subtitles", terms: ["subtitle", "subtitles", "phụ đề"] },
  { topic: "userInterface", terms: ["ui", "menu", "navigate", "navigation", "interface", "giao diện"] },
  { topic: "worldDesign", terms: ["world design", "worldbuilding", "thế giới"] },
  { topic: "difficulty", terms: ["difficulty", "difficult", "hard", "khó"] },
  { topic: "antiCheat", terms: ["anti-cheat", "anticheat", "cheater", "cheating", "gian lận"] },
  { topic: "servers", terms: ["server", "servers", "máy chủ"] },
];

const positiveTerms = ["good", "great", "excellent", "love", "fun", "enjoy", "amazing", "recommend", "tốt", "tuyệt", "hay"];
const negativeTerms = ["bad", "awful", "poor", "broken", "crash", "freeze", "stutter", "missing", "untranslated", "severe", "unreliable", "terrible", "treo", "mất", "gian lận"];
const requestTerms = ["please add", "add ", "i want", "would like", "request", "should have", "mong muốn", "hãy thêm", "thêm "];
const issueTerms = ["crash", "freeze", "broken", "stutter", "disconnect", "missing", "unreliable", "stops", "not responding", "treo", "mất kết nối"];

const includesTerm = (text, term) => text.includes(term);
const hasAny = (text, terms) => terms.some((term) => includesTerm(text, term));
const unique = (values) => [...new Set(values)];

const topicsFor = (text) => topicRules.filter((rule) => hasAny(text, rule.terms)).map((rule) => rule.topic).filter((topic) => topicIds.includes(topic));

const titleFor = (topics, text) => {
  if (topics.includes("crashes") && topics.includes("inventory")) return "Reported crash when opening the inventory";
  if (topics.includes("freezes") && topics.includes("loadingTime")) return "Reported freezes during loading";
  if (topics.includes("stuttering") || topics.includes("frameRate")) return "Reported frame-rate and stuttering problem";
  if (topics.includes("controllerSupport")) return "Reported controller input problem";
  if (topics.includes("localization")) return "Reported missing or unclear localization";
  if (topics.includes("saveSystem")) return "Reported save-system reliability problem";
  if (topics.includes("disconnects")) return "Reported network disconnects";
  if (topics.includes("antiCheat")) return "Reported cheating or anti-cheat concern";
  if (topics.length) return `Reported problem with ${topics[0]}`;
  return text.slice(0, 80).trim() || "Reported player concern";
};

const triggerSignalsFor = (text, topics) => {
  const signals = [];
  if (topics.includes("inventory") && hasAny(text, ["crash", "freeze", "open", "opening"])) signals.push("opening the inventory");
  if (hasAny(text, ["every time", "always", "whenever"])) signals.push("repeated occurrence");
  if (hasAny(text, ["after the latest update", "after update", "patch"])) signals.push("after an update");
  if (hasAny(text, ["when ", "during ", "while "])) signals.push("reported trigger context");
  return unique(signals);
};

const feedbackTypesFor = ({ text, topics, positive, negative, isRequest }) => {
  const types = [];
  const issue = hasAny(text, issueTerms) || topics.some((topic) => ["crashes", "freezes", "disconnects", "saveSystem", "antiCheat"].includes(topic));
  if (isRequest) types.push("featureRequest");
  if (issue) types.push("bugReport");
  if (topics.some((topic) => ["stuttering", "frameRate", "loadingTime"].includes(topic))) {
    types.push("performanceIssue", "stabilityIssue");
  }
  if (topics.some((topic) => ["crashes", "freezes"].includes(topic))) types.push("stabilityIssue");
  if (topics.includes("controllerSupport")) types.push("controllerIssue");
  if (topics.includes("steamDeck")) types.push("steamDeckIssue");
  if (topics.includes("localization") || topics.includes("subtitles")) types.push("localizationIssue");
  if (topics.includes("matchmaking")) types.push("matchmakingIssue", "multiplayerIssue");
  if (topics.includes("disconnects") || topics.includes("servers")) types.push("serverIssue");
  if (topics.includes("userInterface")) types.push("usabilityIssue");
  if (positive && !negative) types.push("positiveFeedback");
  if (negative && !issue && !isRequest) types.push("generalComplaint");
  if (types.length === 0) types.push("nonActionable");
  return unique(types).filter((type) => feedbackTypes.includes(type));
};

const primaryTypeFor = (types) => {
  const priority = ["featureRequest", "bugReport", "performanceIssue", "controllerIssue", "steamDeckIssue", "localizationIssue", "usabilityIssue", "positiveFeedback", "generalComplaint", "nonActionable"];
  return priority.find((type) => types.includes(type)) ?? "nonActionable";
};

const sentimentFor = (positive, negative, recommended) => {
  if (positive && negative) return "mixed";
  if (positive || recommended === true) return "positive";
  if (negative || recommended === false) return "negative";
  return "neutral";
};

const severityFor = ({ text, topics, types }) => {
  if (hasAny(text, ["save corruption", "cannot launch", "can't launch", "account loss"])) return "critical";
  if (topics.includes("crashes") || topics.includes("freezes") || types.includes("performanceIssue")) return "high";
  if (types.some((type) => ["bugReport", "controllerIssue", "localizationIssue"].includes(type))) return "medium";
  if (types.includes("featureRequest") || types.includes("positiveFeedback")) return "unknown";
  return "unknown";
};

const actionabilityFor = ({ text, topics, types, triggers }) => {
  if (text.length < 10) return 0.08;
  let score = 0.05;
  if (text.length >= 30) score += 0.18;
  if (topics.length > 0) score += 0.28;
  if (types.some((type) => ["bugReport", "performanceIssue", "featureRequest", "controllerIssue", "localizationIssue"].includes(type))) score += 0.25;
  if (triggers.length > 0 || hasAny(text, ["steam deck", "pc", "windows", "linux", "after update"])) score += 0.18;
  if (hasAny(text, ["joke", "lol", "10/10", "meme"])) score -= 0.15;
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
};

export const fallbackAnalyzeReview = ({ text = "", language = "unknown", recommended, analysisLanguage = "english" }) => {
  const normalized = String(text).trim();
  const lower = normalized.toLowerCase();
  const topics = topicsFor(lower);
  const positive = hasAny(lower, positiveTerms);
  const negative = hasAny(lower, negativeTerms);
  const isRequest = hasAny(lower, requestTerms);
  const resolvedFeedbackTypes = feedbackTypesFor({ text: lower, topics, positive, negative, isRequest });
  const primaryFeedbackType = primaryTypeFor(resolvedFeedbackTypes);
  const triggers = triggerSignalsFor(lower, topics);
  const actionabilityScore = actionabilityFor({ text: normalized, topics, types: resolvedFeedbackTypes, triggers });
  const sentiment = sentimentFor(positive, negative, recommended);
  const severity = severityFor({ text: lower, topics, types: resolvedFeedbackTypes });
  const issueTypes = ["bugReport", "performanceIssue", "controllerIssue", "steamDeckIssue", "localizationIssue", "usabilityIssue", "serverIssue", "matchmakingIssue"];
  const hasIssue = resolvedFeedbackTypes.some((type) => issueTypes.includes(type));
  const issue = hasIssue
    ? {
        title: titleFor(topics, normalized),
        symptoms: topics.filter((topic) => ["crashes", "freezes", "stuttering", "frameRate", "disconnects"].includes(topic)),
        triggerSignals: triggers,
        environmentSignals: topics.includes("steamDeck") ? ["Steam Deck"] : [],
        workaroundSignals: hasAny(lower, ["workaround", "solution", "fix by", "can avoid"]) ? ["player mentions a workaround"] : [],
        reproductionConfidence: Number((triggers.length ? 0.75 : 0.35).toFixed(2)),
      }
    : null;
  const featureRequestTitle = hasAny(lower, ["manual save", "save slots"])
    ? "manual save slots"
    : `Improve ${topics[0] ?? "the game experience"}`;
  const featureRequest = primaryFeedbackType === "featureRequest" ? { title: featureRequestTitle } : null;
  let summary;
  if (issue) summary = `The review reports ${issue.title.toLowerCase()}.`;
  else if (featureRequest) summary = `The player requests ${featureRequest.title}.`;
  else if (positive && !negative) summary = "The player expresses positive feedback about the game.";
  else summary = `The review expresses a ${sentiment} opinion without specific product details.`;

  return {
    isActionableFeedback: actionabilityScore >= 0.45,
    actionabilityScore,
    primaryFeedbackType,
    feedbackTypes: resolvedFeedbackTypes,
    sentiment,
    severity,
    topics,
    summary,
    issue,
    featureRequest,
    positiveSignals: positive ? topics : [],
    sourceLanguage: language,
    analysisLanguage,
    originalTextPreserved: true,
    modelMetadata: {
      provider: "deterministic-fallback",
      model: "steam-taxonomy-v1",
      schemaVersion: "1.0",
    },
  };
};
