import { reviewTopics } from "../taxonomy/review-topics.js";

const topicTerms = {
  cleanliness: ["clean", "dirty", "sạch", "bẩn"],
  safety: ["safe", "unsafe", "safety", "an toàn"],
  staff: ["staff", "employee", "nhân viên"],
  crowded: ["crowded", "busy", "đông"],
  waiting_time: ["wait", "queue", "chờ"],
  price: ["price", "expensive", "giá", "đắt"],
  value_for_money: ["value", "worth", "đáng tiền"],
  food: ["food", "café", "đồ ăn"],
  parking: ["parking", "đỗ xe"],
  toddler_area: ["toddler", "bé nhỏ"],
  equipment_condition: ["equipment", "broken", "thiết bị"],
  birthday_party: ["birthday", "sinh nhật"],
  accessibility: ["wheelchair", "accessible", "xe lăn"],
  temperature: ["hot", "cold", "nóng", "lạnh"],
  noise: ["noise", "loud", "ồn"],
};
const positives = [
  "good",
  "great",
  "clean",
  "friendly",
  "love",
  "excellent",
  "tốt",
  "sạch",
  "thân thiện",
  "tuyệt",
];
const negatives = [
  "bad",
  "dirty",
  "rude",
  "expensive",
  "crowded",
  "broken",
  "poor",
  "bẩn",
  "đắt",
  "đông",
  "hỏng",
];
export const classifyReview = (text = "") => {
  const normalized = text.toLowerCase();
  const hasPositive = positives.some((word) => normalized.includes(word));
  const hasNegative = negatives.some((word) => normalized.includes(word));
  let sentiment = "neutral";
  if (hasPositive && hasNegative) sentiment = "mixed";
  else if (hasPositive) sentiment = "positive";
  else if (hasNegative) sentiment = "negative";
  return reviewTopics
    .filter((topic) =>
      (topicTerms[topic] ?? []).some((term) => normalized.includes(term)),
    )
    .map((topic) => ({ topic, sentiment }));
};
