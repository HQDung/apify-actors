const assert = (condition, message) => {
  if (!condition) throw new Error(`INVALID_ACTOR_OUTPUT: ${message}`);
};

const integer = (value, name) =>
  assert(
    Number.isInteger(value) && value >= 0,
    `${name} must be a non-negative integer`,
  );

export const validateSourceDiagnostic = (record) => {
  assert(
    record?.recordType === "sourceDiagnostic",
    "source diagnostic recordType is required",
  );
  assert(
    ["googlePlay", "appleAppStore"].includes(record.platform),
    "source diagnostic platform is invalid",
  );
  assert(
    typeof record.appId === "string" && record.appId.length > 0,
    "source diagnostic appId is required",
  );
  assert(
    typeof record.collectedAt === "string" && record.collectedAt.length > 0,
    "source diagnostic collectedAt is required",
  );
  return record;
};

export const validateRunError = (record) => {
  assert(record?.recordType === "runError", "run error recordType is required");
  assert(
    typeof record.code === "string" && record.code.length > 0,
    "run error code is required",
  );
  assert(
    typeof record.message === "string" && record.message.length > 0,
    "run error message is required",
  );
  return record;
};

export const validateRunStats = (stats) => {
  assert(
    typeof stats?.phase === "string" && stats.phase.length > 0,
    "run stats phase is required",
  );
  for (const field of [
    "productsRequested",
    "productsProcessed",
    "googlePlayReviewsCollected",
    "appleAppStoreReviewsCollected",
    "reviewsAnalyzed",
    "platformClustersCreated",
    "crossPlatformComparisonsCreated",
    "errors",
  ])
    integer(stats[field], field);
  assert(
    Number.isInteger(stats.googlePlayRequests) && stats.googlePlayRequests >= 0,
    "googlePlayRequests must be a non-negative integer",
  );
  assert(
    Number.isInteger(stats.appleAppStoreRequests) &&
      stats.appleAppStoreRequests >= 0,
    "appleAppStoreRequests must be a non-negative integer",
  );
  return stats;
};
