import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requiredReviewFields = ["recordType", "game", "review", "source"];
const requiredAnalysisFields = ["primaryFeedbackType", "feedbackTypes", "topics"];
const requiredClusterFields = ["recordType", "clusterId", "game", "feedbackType", "mentionCount", "uniqueReviewCount", "reviewIds"];
const reportStatisticFields = ["reviewsCollected", "reviewsAnalyzed", "actionableReviews", "positiveReviews", "negativeReviews"];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const sortedUnique = (values) => [...new Set(values)].sort();

const countsByRecordType = (records) => {
  const counts = records.reduce((result, record) => {
    result[record.recordType ?? "unknown"] = (result[record.recordType ?? "unknown"] ?? 0) + 1;
    return result;
  }, {});
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
};

const reviewMap = (records) => new Map(
  records.filter((record) => record.recordType === "review" && record.review?.reviewId).map((record) => [String(record.review.reviewId), record]),
);

const clusterMap = (records) => new Map(
  records.filter((record) => record.recordType === "feedbackCluster" && record.clusterId).map((record) => [String(record.clusterId), record]),
);

const pushMissingFields = (errors, value, fields, label) => {
  for (const field of fields) {
    if (value?.[field] === undefined || value?.[field] === null) errors.push(`${label} is missing required field ${field}.`);
  }
};

const validateRecords = (records, label) => {
  const errors = [];
  const reviewIds = new Set();
  for (const [index, record] of records.entries()) {
    const recordLabel = `${label} record ${index + 1}`;
    if (!isObject(record)) {
      errors.push(`${recordLabel} must be an object.`);
      continue;
    }
    if (record.recordType === "review") {
      pushMissingFields(errors, record, requiredReviewFields, recordLabel);
      if (record.review?.reviewId === undefined || record.review?.reviewId === null) continue;
      const reviewId = String(record.review.reviewId);
      if (reviewIds.has(reviewId)) errors.push(`${label} contains duplicate review ID ${reviewId}.`);
      reviewIds.add(reviewId);
      if (record.source?.platform !== "steam") errors.push(`${recordLabel} source.platform must be steam.`);
      if (record.analysisStatus === "success") {
        pushMissingFields(errors, record, ["analysis"], recordLabel);
        pushMissingFields(errors, record.analysis, requiredAnalysisFields, `${recordLabel} analysis`);
      }
    } else if (record.recordType === "feedbackCluster") {
      pushMissingFields(errors, record, requiredClusterFields, recordLabel);
      if (!Array.isArray(record.reviewIds)) errors.push(`${recordLabel} reviewIds must be an array.`);
      if (!Number.isInteger(record.mentionCount) || record.mentionCount < 1) errors.push(`${recordLabel} mentionCount must be a positive integer.`);
    } else {
      errors.push(`${recordLabel} has unsupported recordType ${String(record.recordType)}.`);
    }
  }
  return errors;
};

const validateClusterLinks = (records, label) => {
  const errors = [];
  const reviews = reviewMap(records);
  for (const cluster of records.filter((record) => record.recordType === "feedbackCluster")) {
    const clusterId = String(cluster.clusterId);
    for (const reviewId of cluster.reviewIds ?? []) {
      if (!reviews.has(String(reviewId))) errors.push(`${label} cluster reviewIds for ${clusterId} reference missing review ${reviewId}.`);
    }
    const productIds = sortedUnique((cluster.reviewIds ?? []).map((reviewId) => reviews.get(String(reviewId))?.game?.steamAppId).filter((value) => value !== undefined));
    if (productIds.length > 1) errors.push(`${label} cluster ${clusterId} spans multiple Steam games.`);
    if (productIds.length === 1 && String(productIds[0]) !== String(cluster.game?.steamAppId)) {
      errors.push(`${label} cluster ${clusterId} game does not match its review links.`);
    }
    if (cluster.uniqueReviewCount !== new Set((cluster.reviewIds ?? []).map(String)).size) {
      errors.push(`${label} cluster ${clusterId} uniqueReviewCount does not match reviewIds.`);
    }
  }
  return errors;
};

const compareReviewContracts = (baselineRecords, candidateRecords, errors) => {
  const baselineReviews = reviewMap(baselineRecords);
  const candidateReviews = reviewMap(candidateRecords);
  const baselineIds = sortedUnique([...baselineReviews.keys()]);
  const candidateIds = sortedUnique([...candidateReviews.keys()]);
  if (JSON.stringify(baselineIds) !== JSON.stringify(candidateIds)) {
    errors.push(`Steam review IDs differ: baseline=${baselineIds.join(",")} candidate=${candidateIds.join(",")}.`);
    return;
  }
  for (const reviewId of baselineIds) {
    const baseline = baselineReviews.get(reviewId);
    const candidate = candidateReviews.get(reviewId);
    const comparableFields = [
      ["game.steamAppId", baseline.game?.steamAppId, candidate.game?.steamAppId],
      ["review.language", baseline.review?.language, candidate.review?.language],
      ["review.recommended", baseline.review?.recommended, candidate.review?.recommended],
      ["source.platform", baseline.source?.platform, candidate.source?.platform],
      ["analysisStatus", baseline.analysisStatus, candidate.analysisStatus],
    ];
    for (const [field, left, right] of comparableFields) {
      if (JSON.stringify(left) !== JSON.stringify(right)) errors.push(`Steam review ${reviewId} field ${field} changed.`);
    }
    if (baseline.analysisStatus === "success" && candidate.analysisStatus === "success") {
      for (const field of ["primaryFeedbackType", "feedbackTypes", "topics", "sentiment", "severity", "isActionableFeedback"]) {
        if (JSON.stringify(baseline.analysis?.[field]) !== JSON.stringify(candidate.analysis?.[field])) {
          errors.push(`Steam review ${reviewId} analysis field ${field} changed.`);
        }
      }
    }
  }
};

const compareClusters = (baselineRecords, candidateRecords, errors) => {
  const baselineClusters = clusterMap(baselineRecords);
  const candidateClusters = clusterMap(candidateRecords);
  const baselineIds = sortedUnique([...baselineClusters.keys()]);
  const candidateIds = sortedUnique([...candidateClusters.keys()]);
  if (JSON.stringify(baselineIds) !== JSON.stringify(candidateIds)) {
    errors.push(`Steam cluster IDs differ: baseline=${baselineIds.join(",")} candidate=${candidateIds.join(",")}.`);
    return;
  }
  for (const clusterId of baselineIds) {
    const baseline = baselineClusters.get(clusterId);
    const candidate = candidateClusters.get(clusterId);
    for (const field of ["feedbackType", "mentionCount", "uniqueReviewCount", "reviewIds", "game.steamAppId"]) {
      const get = (value) => field === "game.steamAppId" ? value.game?.steamAppId : value[field];
      if (JSON.stringify(get(baseline)) !== JSON.stringify(get(candidate))) errors.push(`Steam cluster ${clusterId} field ${field} changed.`);
    }
  }
};

const reportMap = (reports = {}) => new Map(Object.entries(reports));

const compareReports = (baselineReports, candidateReports, errors) => {
  const baseline = reportMap(baselineReports);
  const candidate = reportMap(candidateReports);
  if (JSON.stringify(sortedUnique([...baseline.keys()])) !== JSON.stringify(sortedUnique([...candidate.keys()]))) {
    errors.push("Steam report keys differ.");
    return;
  }
  for (const [key, baselineReport] of baseline.entries()) {
    const candidateReport = candidate.get(key);
    if (baselineReport.recordType !== candidateReport.recordType) errors.push(`Steam report ${key} recordType changed.`);
    if (baselineReport.game?.steamAppId !== candidateReport.game?.steamAppId) errors.push(`Steam report ${key} game changed.`);
    for (const field of reportStatisticFields) {
      if (baselineReport.statistics?.[field] !== candidateReport.statistics?.[field]) errors.push(`Steam report ${key} statistic ${field} changed.`);
    }
  }
};

export const compareSteamOutputs = (baseline, candidate) => {
  const baselineRecords = Array.isArray(baseline?.records) ? baseline.records : [];
  const candidateRecords = Array.isArray(candidate?.records) ? candidate.records : [];
  const errors = [
    ...validateRecords(baselineRecords, "Baseline"),
    ...validateRecords(candidateRecords, "Candidate"),
    ...validateClusterLinks(baselineRecords, "Baseline"),
    ...validateClusterLinks(candidateRecords, "Candidate"),
  ];
  const baselineCounts = countsByRecordType(baselineRecords);
  const candidateCounts = countsByRecordType(candidateRecords);
  if (JSON.stringify(baselineCounts) !== JSON.stringify(candidateCounts)) errors.push("Steam record counts differ.");
  compareReviewContracts(baselineRecords, candidateRecords, errors);
  compareClusters(baselineRecords, candidateRecords, errors);
  compareReports(baseline?.reports, candidate?.reports, errors);
  return {
    valid: errors.length === 0,
    errors,
    warnings: ["Generated summaries, scrape timestamps, report generatedAt, and provider metadata are intentionally not compared byte-for-byte."],
    summary: {
      recordCounts: { baseline: baselineCounts, candidate: candidateCounts },
      reviewIds: { baseline: sortedUnique([...reviewMap(baselineRecords).keys()]), candidate: sortedUnique([...reviewMap(candidateRecords).keys()]) },
      clusterIds: { baseline: sortedUnique([...clusterMap(baselineRecords).keys()]), candidate: sortedUnique([...clusterMap(candidateRecords).keys()]) },
      reportKeys: { baseline: sortedUnique(Object.keys(baseline?.reports ?? {})), candidate: sortedUnique(Object.keys(candidate?.reports ?? {})) },
    },
  };
};

const readJsonFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const records = [];
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json")).sort((a, b) => a.name.localeCompare(b.name))) {
    const parsed = JSON.parse(await readFile(path.join(directory, entry.name), "utf8"));
    records.push(...(Array.isArray(parsed) ? parsed : [parsed]));
  }
  return records;
};

const resolveSnapshotDirectories = async (root) => {
  const directDataset = path.join(root, "dataset");
  const directKeyValueStore = path.join(root, "key-value-store");
  const storageDataset = path.join(root, "storage", "datasets", "default");
  const storageKeyValueStore = path.join(root, "storage", "key_value_stores", "default");
  const hasDirect = (await readdir(directDataset).then(() => true).catch(() => false));
  return {
    dataset: hasDirect ? directDataset : storageDataset,
    keyValueStore: hasDirect ? directKeyValueStore : storageKeyValueStore,
  };
};

export const readSteamSnapshot = async (root) => {
  const directories = await resolveSnapshotDirectories(path.resolve(root));
  const records = await readJsonFiles(directories.dataset);
  const reports = {};
  for (const entry of await readdir(directories.keyValueStore, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isFile() || !entry.name.endsWith("_REPORT.json")) continue;
    reports[entry.name.replace(/\.json$/, "")] = JSON.parse(await readFile(path.join(directories.keyValueStore, entry.name), "utf8"));
  }
  return { records, reports };
};

const main = async () => {
  const [baselineRoot, candidateRoot] = process.argv.slice(2);
  if (!baselineRoot || !candidateRoot) {
    console.error("Usage: node scripts/compare-steam-output.mjs <baseline-snapshot> <candidate-snapshot>");
    process.exitCode = 2;
    return;
  }
  const result = compareSteamOutputs(await readSteamSnapshot(baselineRoot), await readSteamSnapshot(candidateRoot));
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
