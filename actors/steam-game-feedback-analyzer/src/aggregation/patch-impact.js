const dayMs = 24 * 60 * 60 * 1000;

const increment = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
const analysisRecords = (records) => records.filter((record) => record.analysisStatus === "success" && record.analysis);
const ranked = (entries) => entries.sort((left, right) => Math.abs(right.change) - Math.abs(left.change) || left.topic.localeCompare(right.topic));

export const buildPatchWindows = ({ releasedAt, daysBefore = 14, daysAfter = 14 }) => {
  const patchTime = new Date(releasedAt).getTime();
  const beforeFrom = new Date(patchTime - daysBefore * dayMs).toISOString();
  const beforeTo = new Date(patchTime - 1).toISOString();
  const afterFrom = new Date(patchTime).toISOString();
  const afterTo = new Date(patchTime + daysAfter * dayMs - 1).toISOString();
  return {
    before: { from: beforeFrom, to: beforeTo, recentDays: null },
    after: { from: afterFrom, to: afterTo, recentDays: null },
  };
};

const topicCounts = (records) => {
  const counts = new Map();
  for (const record of analysisRecords(records)) for (const topic of record.analysis.topics) increment(counts, topic);
  return counts;
};

const issueCounts = (records) => {
  const counts = new Map();
  for (const record of analysisRecords(records)) {
    const title = record.analysis.issue?.title ?? record.analysis.featureRequest?.title;
    if (title) increment(counts, title);
  }
  return counts;
};

export const comparePatchImpact = ({ game, patch, beforeRecords, afterRecords, windows = null, generatedAt = new Date().toISOString() }) => {
  const beforeTopics = topicCounts(beforeRecords);
  const afterTopics = topicCounts(afterRecords);
  const topicNames = [...new Set([...beforeTopics.keys(), ...afterTopics.keys()])].sort();
  const topicChanges = ranked(topicNames.map((topic) => {
    const beforeMentionCount = beforeTopics.get(topic) ?? 0;
    const afterMentionCount = afterTopics.get(topic) ?? 0;
    const change = afterMentionCount - beforeMentionCount;
    let direction = "unchanged";
    if (change > 0) direction = "increased";
    else if (change < 0) direction = "decreased";
    return {
      topic,
      beforeMentionCount,
      afterMentionCount,
      change,
      direction,
      possibleRegression: beforeMentionCount > 0 && change > 0,
    };
  }));
  const beforeIssues = issueCounts(beforeRecords);
  const afterIssues = issueCounts(afterRecords);
  const newIssues = [...afterIssues.entries()]
    .filter(([title]) => !beforeIssues.has(title))
    .map(([title, mentionCount]) => ({ title, mentionCount }))
    .sort((left, right) => right.mentionCount - left.mentionCount || left.title.localeCompare(right.title));
  const improvedTopics = topicChanges.filter((entry) => entry.change < 0).map(({ topic, change }) => ({ topic, change }));
  const possibleRegressions = topicChanges
    .filter((entry) => entry.possibleRegression)
    .map(({ topic, change, beforeMentionCount, afterMentionCount }) => ({ topic, change, beforeMentionCount, afterMentionCount, reason: "More mentions appeared after the patch; this is not a causal confirmation." }));

  return {
    recordType: "patchImpactReport",
    game,
    patch,
    windows,
    statistics: {
      beforeReviews: beforeRecords.length,
      afterReviews: afterRecords.length,
      beforeAnalyzed: analysisRecords(beforeRecords).length,
      afterAnalyzed: analysisRecords(afterRecords).length,
    },
    topicChanges,
    newIssues,
    improvedTopics,
    possibleRegressions,
    disclaimer: "Changes are observational comparisons of player reviews, not a causal confirmation that the patch caused an issue or improvement.",
    generatedAt,
  };
};
