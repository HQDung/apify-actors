import { localeKeywords } from "../locales/index.js";
import { normalizeText } from "../normalization/index.js";

export const venueTypes = [
  "indoor_playground",
  "soft_play_center",
  "kids_activity_center",
  "family_entertainment_center",
  "trampoline_park",
  "children_museum",
  "play_cafe",
  "birthday_party_venue",
  "adventure_park",
  "water_playground",
  "role_play_center",
  "kids_club",
  "outdoor_playground",
  "other",
];

const textRules = [
  ["trampoline_park", /\btrampoline\b|bat nhun/, 0.98],
  ["soft_play_center", /\bsoft\s*play\b|nha banh/, 0.97],
  ["children_museum", /children'?s museum|kids museum|bao tang tre em/, 0.97],
  ["play_cafe", /\bplay\s*caf[eé]\b|kidsplay cafe|ca phe.*vui choi/, 0.96],
  ["water_playground", /water playground|splash pad|vui choi nuoc/, 0.96],
  ["role_play_center", /role[ -]?play|huong nghiep/, 0.95],
  ["outdoor_playground", /outdoor playground|san choi ngoai troi/, 0.95],
  ["adventure_park", /adventure park|cong vien phieu luu/, 0.94],
  ["kids_club", /\bkids? club\b|cau lac bo tre em/, 0.93],
  [
    "family_entertainment_center",
    /family entertainment|amusement cent(?:er|re)/,
    0.9,
  ],
  [
    "kids_activity_center",
    /kids activity|children'?s activity|trung tam hoat dong tre em/,
    0.9,
  ],
  [
    "indoor_playground",
    /indoor (?:playground|play)|softplay|vui choi.*trong nha/,
    0.9,
  ],
];

const activityRules = {
  trampoline: ["trampoline_park", 0.95],
  soft_play: ["soft_play_center", 0.86],
  water_play: ["water_playground", 0.86],
  role_play: ["role_play_center", 0.84],
  arcade_games: ["family_entertainment_center", 0.74],
  birthday_party: ["birthday_party_venue", 0.78],
};

const searchTypeForTerm = (term) => {
  const normalized = normalizeText(term);
  for (const locale of Object.values(localeKeywords)) {
    for (const [id, terms] of Object.entries(locale)) {
      if (terms.some((candidate) => normalizeText(candidate) === normalized))
        return id;
    }
  }
  return null;
};

export const classifyVenueTypes = ({
  name = "",
  category = "",
  searchTerms = [],
  activities = [],
}) => {
  const scores = new Map();
  const add = (id, confidence) =>
    scores.set(id, Math.max(scores.get(id) ?? 0, confidence));
  const evidenceText = normalizeText(`${name} ${category}`);

  for (const [id, pattern, confidence] of textRules)
    if (pattern.test(evidenceText)) add(id, confidence);
  for (const activity of activities) {
    const rule = activityRules[activity.id];
    if (rule) add(...rule);
  }

  if (!scores.size && !normalizeText(`${name} ${category}`)) {
    for (const term of searchTerms) {
      const id = searchTypeForTerm(term);
      if (id) add(id, 0.55);
    }
  }
  if (!scores.size) add("other", 0.4);

  return [...scores.entries()]
    .map(([id, confidence]) => ({ id, confidence }))
    .sort(
      (left, right) =>
        right.confidence - left.confidence || left.id.localeCompare(right.id),
    );
};
