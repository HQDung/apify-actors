const increment = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
const analyses = (records) => records.filter((record) => (record.analysis?.analysisStatus ?? record.analysisStatus) === "success" && record.analysis);
const topicCounts = (records) => {
  const counts = new Map();
  for (const record of analyses(records)) for (const topic of record.analysis.topics ?? []) increment(counts, topic);
  return counts;
};
const issueCounts = (records) => {
  const counts = new Map();
  for (const record of analyses(records)) {
    const title = record.analysis.issue?.title ?? record.analysis.featureRequest?.title;
    if (title) increment(counts, title);
  }
  return counts;
};

export const compareFeedbackWindows = ({ product, beforeRecords, afterRecords, windows = null, generatedAt = new Date().toISOString() }) => {
  const beforeTopics = topicCounts(beforeRecords);
  const afterTopics = topicCounts(afterRecords);
  const topicNames = [...new Set([...beforeTopics.keys(), ...afterTopics.keys()])].sort();
  const topicChanges = topicNames.map((topic) => {
    const beforeMentionCount = beforeTopics.get(topic) ?? 0;
    const afterMentionCount = afterTopics.get(topic) ?? 0;
    const change = afterMentionCount - beforeMentionCount;
    return {
      topic,
      beforeMentionCount,
      afterMentionCount,
      change,
      direction: change > 0 ? "increased" : change < 0 ? "decreased" : "unchanged",
      possibleRegression: beforeMentionCount > 0 && change > 0,
    };
  }).sort((left, right) => Math.abs(right.change) - Math.abs(left.change) || left.topic.localeCompare(right.topic));
  const beforeIssues = issueCounts(beforeRecords);
  const afterIssues = issueCounts(afterRecords);
  const newIssues = [...afterIssues.entries()]
    .filter(([title]) => !beforeIssues.has(title))
    .map(([title, mentionCount]) => ({ title, mentionCount }))
    .sort((left, right) => right.mentionCount - left.mentionCount || left.title.localeCompare(right.title));
  return {
    recordType: "feedbackImpactReport",
    product,
    windows,
    statistics: {
      beforeReviews: beforeRecords.length,
      afterReviews: afterRecords.length,
      beforeAnalyzed: analyses(beforeRecords).length,
      afterAnalyzed: analyses(afterRecords).length,
    },
    topicChanges,
    newIssues,
    improvedTopics: topicChanges.filter((entry) => entry.change < 0).map(({ topic, change }) => ({ topic, change })),
    possibleRegressions: topicChanges
      .filter((entry) => entry.possibleRegression)
      .map(({ topic, change, beforeMentionCount, afterMentionCount }) => ({ topic, change, beforeMentionCount, afterMentionCount, reason: "More mentions appeared after the release window; this is not a causal confirmation." })),
    disclaimer: "Changes are observational comparisons of user feedback, not a causal confirmation that a release caused an issue or improvement.",
    generatedAt,
  };
};
