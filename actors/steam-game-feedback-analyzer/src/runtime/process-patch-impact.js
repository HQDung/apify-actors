import { buildPatchWindows, comparePatchImpact } from "../aggregation/patch-impact.js";
import { processGame } from "./process-game.js";

export const processPatchImpactGame = async ({
  appId,
  input,
  client,
  statistics,
  pushData,
  generatedAt = new Date().toISOString(),
}) => {
  const windows = buildPatchWindows({
    releasedAt: input.patch.releasedAt,
    daysBefore: input.daysBefore,
    daysAfter: input.daysAfter,
  });
  const periodInput = (dateRange) => ({
    ...input,
    mode: "feedbackAnalysis",
    dateRange,
    maxReviewsPerGame: input.maxReviewsPerPeriod,
    analysis: { ...input.analysis, enabled: true, clusterSimilarIssues: false },
    aggregation: { ...input.aggregation, enabled: false },
  });
  const before = await processGame({
    appId,
    input: periodInput(windows.before),
    client,
    statistics,
    pushData,
    scrapedAt: generatedAt,
  });
  const after = await processGame({
    appId,
    input: periodInput(windows.after),
    client,
    statistics,
    pushData,
    scrapedAt: generatedAt,
  });
  const report = comparePatchImpact({
    game: before.game,
    patch: input.patch,
    windows,
    beforeRecords: before.records,
    afterRecords: after.records,
    generatedAt,
  });
  return { game: before.game, beforeRecords: before.records, afterRecords: after.records, report };
};
