import { calculateTopicStats } from "./calculate-topic-stats.js";

const increment = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
const sortCount = (left, right) => right.mentionCount - left.mentionCount || left.title.localeCompare(right.title);

const windowFor = (records, dateRange) => {
  const dates = records.map((record) => record.review.createdAt).filter(Boolean).sort();
  return {
    from: dateRange?.from ?? dates[0] ?? null,
    to: dateRange?.to ?? dates.at(-1) ?? null,
  };
};

export const aggregateGameReport = ({ game, records, clusters = [], dateRange = {}, generatedAt = new Date().toISOString() }) => {
  const analyses = records
    .filter((record) => record.analysisStatus === "success" && record.analysis)
    .map((record) => ({ record, analysis: record.analysis }));
  const issueCounts = new Map();
  const featureCounts = new Map();
  const localizationCounts = new Map();
  const languages = new Map();

  for (const record of records) increment(languages, record.review.language ?? "unknown");
  for (const { record, analysis } of analyses) {
    if (analysis.issue) {
      const key = analysis.issue.title;
      const current = issueCounts.get(key) ?? { mentionCount: 0, severity: analysis.severity, reviewIds: [] };
      current.mentionCount += 1;
      current.reviewIds.push(record.review.reviewId);
      if (["critical", "high", "medium", "low"].indexOf(analysis.severity) < ["critical", "high", "medium", "low"].indexOf(current.severity)) current.severity = analysis.severity;
      issueCounts.set(key, current);
    }
    if (analysis.featureRequest) {
      const key = analysis.featureRequest.title;
      const current = featureCounts.get(key) ?? { mentionCount: 0, reviewIds: [] };
      current.mentionCount += 1;
      current.reviewIds.push(record.review.reviewId);
      featureCounts.set(key, current);
    }
    if (analysis.topics.some((topic) => ["localization", "subtitles"].includes(topic))) {
      const key = `${analysis.sourceLanguage}:${analysis.topics.find((topic) => ["localization", "subtitles"].includes(topic))}`;
      const current = localizationCounts.get(key) ?? { language: analysis.sourceLanguage, topic: "localization", mentionCount: 0 };
      current.mentionCount += 1;
      localizationCounts.set(key, current);
    }
  }

  const topicStats = calculateTopicStats(analyses.map(({ analysis }) => analysis));
  const topIssues = [...issueCounts.entries()]
    .map(([title, value]) => ({ clusterId: clusters.find((cluster) => cluster.canonicalIssue === title)?.clusterId ?? null, title, mentionCount: value.mentionCount, severity: value.severity, trend: "unknown", reviewIds: value.reviewIds }))
    .sort(sortCount)
    .slice(0, 20);
  const topFeatureRequests = [...featureCounts.entries()]
    .map(([title, value]) => ({ title, mentionCount: value.mentionCount, reviewIds: value.reviewIds }))
    .sort(sortCount)
    .slice(0, 20);
  const localizationInsights = [...localizationCounts.values()]
    .map((value) => ({ ...value, summary: `Players with ${value.language} review text mention localization or subtitle concerns.` }))
    .sort((left, right) => right.mentionCount - left.mentionCount);

  return {
    recordType: "gameFeedbackReport",
    game,
    reviewWindow: windowFor(records, dateRange),
    statistics: {
      reviewsCollected: records.length,
      reviewsAnalyzed: analyses.length,
      positiveReviews: records.filter((record) => record.review.recommended).length,
      negativeReviews: records.filter((record) => !record.review.recommended).length,
      actionableReviews: analyses.filter(({ analysis }) => analysis.isActionableFeedback).length,
      languages: Object.fromEntries(languages),
    },
    topIssues,
    topFeatureRequests,
    topPositiveTopics: topicStats.topPositiveTopics,
    topNegativeTopics: topicStats.topNegativeTopics,
    localizationInsights,
    generatedAt,
  };
};
