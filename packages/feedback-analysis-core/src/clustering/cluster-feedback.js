import { createClusterId } from "./cluster-id.js";

const severityRank = { unknown: 0, low: 1, medium: 2, high: 3, critical: 4 };
const tokensFor = (value) => new Set(String(value).toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2));
const overlap = (left, right) => {
  const intersection = [...left].filter((value) => right.has(value)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
};
const analysisFor = (record) => record.analysis ?? {};
const productFor = (record) => record.product ?? {};
const reviewIdFor = (record) => String(record.source?.sourceRecordId ?? record.feedback?.sourceRecordId ?? "");
const languageFor = (record) => record.feedback?.sourceLanguage ?? analysisFor(record).sourceLanguage ?? "unknown";
const createdAtFor = (record) => record.feedback?.createdAt ?? null;

const candidateFor = (record) => {
  const analysis = analysisFor(record);
  const title = analysis.issue?.title ?? analysis.featureRequest?.title;
  const status = analysis.analysisStatus ?? record.analysisStatus;
  if (status !== "success" || !title || !analysis.isActionableFeedback) return null;
  const product = productFor(record);
  return {
    record,
    productId: String(product.productId ?? ""),
    product,
    feedbackType: analysis.primaryFeedbackType,
    title,
    topics: new Set(analysis.topics ?? []),
    titleTokens: tokensFor(title),
    severity: analysis.severity ?? "unknown",
  };
};

const similar = (left, right) => {
  if (left.productId !== right.productId || left.feedbackType !== right.feedbackType) return false;
  return overlap(left.topics, right.topics) >= 0.5 || overlap(left.titleTokens, right.titleTokens) >= 0.5;
};

export const clusterFeedback = ({ records, minimumClusterSize = 2 }) => {
  const groups = [];
  for (const record of records) {
    const candidate = candidateFor(record);
    if (!candidate) continue;
    const group = groups.find((members) => members.some((member) => similar(member, candidate)));
    if (group) group.push(candidate);
    else groups.push([candidate]);
  }

  const reviewClusterIds = {};
  const clusters = groups.filter((members) => members.length >= minimumClusterSize).map((members) => {
    const canonical = [...members].sort((left, right) => left.title.localeCompare(right.title))[0];
    const clusterId = createClusterId({ productId: canonical.productId, feedbackType: canonical.feedbackType, title: canonical.title });
    const topics = [...new Set(members.flatMap((member) => [...member.topics]))].sort();
    const reviewIds = members.map((member) => reviewIdFor(member.record));
    for (const reviewId of reviewIds) reviewClusterIds[reviewId] = clusterId;
    const dates = members.map((member) => createdAtFor(member.record)).filter(Boolean).sort();
    const severity = members.reduce((current, member) => (severityRank[member.severity] > severityRank[current] ? member.severity : current), "unknown");
    const confidence = members.length === 1
      ? 0.6
      : members.slice(1).reduce((total, member) => total + Math.max(overlap(canonical.topics, member.topics), overlap(canonical.titleTokens, member.titleTokens)), 0) / (members.length - 1);
    return {
      recordType: "feedbackCluster",
      clusterId,
      productId: canonical.productId,
      product: canonical.product,
      canonicalIssue: canonical.title,
      feedbackType: canonical.feedbackType,
      topics,
      mentionCount: members.length,
      uniqueReviewCount: new Set(reviewIds).size,
      languages: [...new Set(members.map((member) => languageFor(member.record)))].sort(),
      countries: [...new Set(members.map((member) => member.record.environmentContext?.countryCode).filter(Boolean))].sort(),
      affectedVersions: [...new Set(members.map((member) => member.record.environmentContext?.appVersion).filter(Boolean))].sort(),
      firstSeenAt: dates[0] ?? null,
      latestSeenAt: dates.at(-1) ?? null,
      severity,
      clusterConfidence: Number(Math.min(1, Math.max(0, confidence)).toFixed(2)),
      reviewIds,
      exampleReviewIds: reviewIds.slice(0, 3),
    };
  });
  return { clusters, reviewClusterIds };
};
