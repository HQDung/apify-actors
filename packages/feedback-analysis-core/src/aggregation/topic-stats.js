const increment = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
const ranked = (map, field) => [...map.entries()]
  .map(([key, value]) => ({ [field]: key, mentionCount: value }))
  .sort((left, right) => right.mentionCount - left.mentionCount || String(left[field]).localeCompare(String(right[field])));

export const calculateTopicStats = (analyses) => {
  const positive = new Map();
  const negative = new Map();
  for (const analysis of analyses) {
    const target = analysis.sentiment === "positive" ? positive : analysis.sentiment === "negative" ? negative : null;
    if (!target) continue;
    for (const topic of analysis.topics ?? []) increment(target, topic);
  }
  return {
    topPositiveTopics: ranked(positive, "topic").slice(0, 20),
    topNegativeTopics: ranked(negative, "topic").slice(0, 20),
  };
};
