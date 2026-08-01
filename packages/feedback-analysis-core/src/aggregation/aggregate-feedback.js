import { calculateTopicStats } from "./topic-stats.js";

const increment = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
const analysisOf = (record) => record.analysis ?? {};
const successful = (records) => records.filter((record) => (analysisOf(record).analysisStatus ?? record.analysisStatus) === "success" && record.analysis);
const languageOf = (record) => record.feedback?.sourceLanguage ?? analysisOf(record).sourceLanguage ?? "unknown";
const productOf = (record) => record.product ?? {};
const windowFor = (records, dateRange) => {
  const dates = records.map((record) => record.feedback?.createdAt).filter(Boolean).sort();
  return { from: dateRange?.from ?? dates[0] ?? null, to: dateRange?.to ?? dates.at(-1) ?? null };
};
const ranked = (entries) => entries.sort((left, right) => right.mentionCount - left.mentionCount || left.title.localeCompare(right.title));

const distribution = (records, getter) => {
  const counts = new Map();
  for (const record of records) {
    const value = getter(record);
    if (value) increment(counts, value);
  }
  return Object.fromEntries(counts);
};

export const aggregateFeedback = ({ product, records, clusters = [], dateRange = {}, generatedAt = new Date().toISOString() }) => {
  const analyses = successful(records).map((record) => ({ record, analysis: analysisOf(record) }));
  const issueCounts = new Map();
  const featureCounts = new Map();
  const localizationCounts = new Map();
  for (const { record, analysis } of analyses) {
    if (analysis.issue) {
      const key = analysis.issue.title;
      const current = issueCounts.get(key) ?? { mentionCount: 0, severity: analysis.severity, reviewIds: [] };
      current.mentionCount += 1;
      current.reviewIds.push(String(record.source?.sourceRecordId ?? record.feedback?.sourceRecordId));
      if ((["critical", "high", "medium", "low"].indexOf(analysis.severity)) < (["critical", "high", "medium", "low"].indexOf(current.severity))) current.severity = analysis.severity;
      issueCounts.set(key, current);
    }
    if (analysis.featureRequest) {
      const key = analysis.featureRequest.title;
      const current = featureCounts.get(key) ?? { mentionCount: 0, reviewIds: [] };
      current.mentionCount += 1;
      current.reviewIds.push(String(record.source?.sourceRecordId ?? record.feedback?.sourceRecordId));
      featureCounts.set(key, current);
    }
    for (const topic of (analysis.topics ?? []).filter((value) => ["localization", "subtitles"].includes(value))) {
      const language = languageOf(record);
      const key = `${language}:${topic}`;
      const current = localizationCounts.get(key) ?? { language, topic: "localization", mentionCount: 0 };
      current.mentionCount += 1;
      localizationCounts.set(key, current);
    }
  }
  const topicStats = calculateTopicStats(analyses.map(({ analysis }) => analysis));
  const topIssues = ranked([...issueCounts.entries()].map(([title, value]) => ({
    clusterId: clusters.find((cluster) => cluster.canonicalIssue === title)?.clusterId ?? null,
    title,
    mentionCount: value.mentionCount,
    severity: value.severity,
    trend: "unknown",
    reviewIds: value.reviewIds,
  }))).slice(0, 20);
  const topFeatureRequests = ranked([...featureCounts.entries()].map(([title, value]) => ({ title, ...value }))).slice(0, 20);
  const ratings = records.map((record) => record.feedback?.rating).filter((rating) => Number.isFinite(rating));
  return {
    recordType: "productFeedbackReport",
    product,
    reviewWindow: windowFor(records, dateRange),
    statistics: {
      reviewsCollected: records.length,
      reviewsAnalyzed: analyses.length,
      actionableReviews: analyses.filter(({ analysis }) => analysis.isActionableFeedback).length,
      positiveReviews: records.filter((record) => record.feedback?.isPositive === true).length,
      negativeReviews: records.filter((record) => record.feedback?.isPositive === false).length,
      averageRating: ratings.length ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(2)) : null,
      languages: distribution(records, languageOf),
      countries: distribution(records, (record) => record.environmentContext?.countryCode),
      versions: distribution(records, (record) => record.environmentContext?.appVersion ?? productOf(record).version),
    },
    topIssues,
    topFeatureRequests,
    topPositiveTopics: topicStats.topPositiveTopics,
    topNegativeTopics: topicStats.topNegativeTopics,
    localizationInsights: [...localizationCounts.values()]
      .map((value) => ({ ...value, summary: `Feedback in ${value.language} mentions localization or subtitle concerns.` }))
      .sort((left, right) => right.mentionCount - left.mentionCount || left.language.localeCompare(right.language)),
    languageInsights: Object.entries(distribution(records, languageOf)).map(([language, mentionCount]) => ({ language, mentionCount })),
    countryInsights: Object.entries(distribution(records, (record) => record.environmentContext?.countryCode)).map(([countryCode, mentionCount]) => ({ countryCode, mentionCount })),
    versionInsights: Object.entries(distribution(records, (record) => record.environmentContext?.appVersion ?? productOf(record).version)).map(([version, mentionCount]) => ({ version, mentionCount })),
    generatedAt,
  };
};
