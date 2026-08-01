import { compareFeedbackWindows } from "@project/feedback-analysis-core";

const dayMs = 24 * 60 * 60 * 1000;
const assert = (condition, message) => {
  if (!condition)
    throw new Error(`INVALID_RELEASE_COMPARISON_REPORT: ${message}`);
};

export const buildReleaseWindows = ({
  releasedAt,
  daysBefore = 14,
  daysAfter = 14,
}) => {
  const releaseTime = Date.parse(releasedAt);
  if (!Number.isFinite(releaseTime))
    throw new Error(
      "INVALID_RELEASE_COMPARISON: releasedAt must be an ISO date-time",
    );
  return {
    before: {
      from: new Date(releaseTime - daysBefore * dayMs).toISOString(),
      to: new Date(releaseTime - 1).toISOString(),
    },
    after: {
      from: new Date(releaseTime).toISOString(),
      to: new Date(releaseTime + daysAfter * dayMs - 1).toISOString(),
    },
  };
};

const recordsForWindow = (records, window) =>
  records.filter((record) => {
    const date = record.normalizedFeedback?.feedback?.createdAt;
    return date && date >= window.from && date <= window.to;
  });

const coreRecords = (records) =>
  records.map((entry) => ({
    ...entry.normalizedFeedback,
    analysis: entry.analysis,
  }));

const statisticsFor = (impact) => ({
  beforeReviews: impact.statistics.beforeReviews,
  afterReviews: impact.statistics.afterReviews,
  beforeAnalyzed: impact.statistics.beforeAnalyzed,
  afterAnalyzed: impact.statistics.afterAnalyzed,
});

const platformName = (platform) =>
  platform === "googlePlay" ? "android" : "ios";

const validateReport = (report) => {
  assert(
    report.recordType === "releaseComparisonReport",
    "recordType is required",
  );
  assert(report.product?.productId, "product.productId is required");
  assert(
    report.platforms?.android && report.platforms?.ios,
    "both platform results are required",
  );
  assert(
    report.platforms.android.windows.before.to <
      report.platforms.android.windows.after.from,
    "Android release windows overlap",
  );
  assert(
    report.platforms.ios.windows.before.to <
      report.platforms.ios.windows.after.from,
    "iOS release windows overlap",
  );
  assert(Array.isArray(report.warnings), "warnings must be an array");
  return report;
};

export const buildReleaseComparisonReport = ({
  product,
  analysisRecords,
  daysBefore = 14,
  daysAfter = 14,
  minimumReleaseReviews = 5,
  generatedAt = new Date().toISOString(),
}) => {
  const platforms = {};
  const warnings = [];
  for (const platform of ["googlePlay", "appleAppStore"]) {
    const name = platformName(platform);
    const release = product.releases[name];
    const windows = buildReleaseWindows({
      releasedAt: release.releasedAt,
      daysBefore,
      daysAfter,
    });
    const records = analysisRecords.filter(
      (entry) =>
        entry.normalizedFeedback?.source.platform ===
        (platform === "googlePlay" ? "google-play" : "apple-app-store"),
    );
    const before = recordsForWindow(records, windows.before);
    const after = recordsForWindow(records, windows.after);
    const impact = compareFeedbackWindows({
      product: { productId: product.productId, name: product.name },
      beforeRecords: coreRecords(before),
      afterRecords: coreRecords(after),
      windows,
      generatedAt,
    });
    const missingVersionMetadata = records.filter(
      (entry) => !entry.normalizedFeedback?.environmentContext?.appVersion,
    ).length;
    if (before.length < minimumReleaseReviews)
      warnings.push({
        code: "LOW_RELEASE_SAMPLE",
        platform: name,
        window: "before",
        message: `${name} has ${before.length} reviews before release; ${minimumReleaseReviews} are required.`,
      });
    if (after.length < minimumReleaseReviews)
      warnings.push({
        code: "LOW_RELEASE_SAMPLE",
        platform: name,
        window: "after",
        message: `${name} has ${after.length} reviews after release; ${minimumReleaseReviews} are required.`,
      });
    if (missingVersionMetadata > 0)
      warnings.push({
        code: "MISSING_APP_VERSION_METADATA",
        platform: name,
        message: `${missingVersionMetadata} collected reviews do not include app-version metadata.`,
      });
    platforms[name] = {
      release,
      windows,
      statistics: statisticsFor(impact),
      topicChanges: impact.topicChanges,
      newIssues: impact.newIssues,
      possibleRegressions: impact.possibleRegressions,
      improvedTopics: impact.improvedTopics,
    };
  }
  const androidRegressions = new Map(
    platforms.android.possibleRegressions.map((entry) => [entry.topic, entry]),
  );
  const iosRegressions = new Map(
    platforms.ios.possibleRegressions.map((entry) => [entry.topic, entry]),
  );
  const sharedRegressions = [...androidRegressions.keys()]
    .filter((topic) => iosRegressions.has(topic))
    .map((topic) => ({
      topic,
      android: androidRegressions.get(topic),
      ios: iosRegressions.get(topic),
    }));
  const report = {
    recordType: "releaseComparisonReport",
    product,
    platforms,
    rolloutTiming: {
      androidReleasedAt: product.releases.android.releasedAt,
      iosReleasedAt: product.releases.ios.releasedAt,
      releaseLagDays: Number(
        (
          (Date.parse(product.releases.ios.releasedAt) -
            Date.parse(product.releases.android.releasedAt)) /
          dayMs
        ).toFixed(2),
      ),
    },
    sharedRegressions,
    platformSpecificRegressions: {
      android: platforms.android.possibleRegressions.filter(
        (entry) => !iosRegressions.has(entry.topic),
      ),
      ios: platforms.ios.possibleRegressions.filter(
        (entry) => !androidRegressions.has(entry.topic),
      ),
    },
    warnings,
    disclaimer:
      "Release differences are observational comparisons of bounded review windows, not causal confirmation that a release caused an issue or improvement.",
    generatedAt,
  };
  return validateReport(report);
};
