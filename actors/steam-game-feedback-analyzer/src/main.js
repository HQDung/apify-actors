import { Actor, log } from "apify";

import { aggregateGameReport } from "./aggregation/aggregate-game-report.js";
import { normalizeInput } from "./input/normalize-input.js";
import { saveGameReport } from "./output/save-game-report.js";
import { processGame } from "./runtime/process-game.js";
import { processPatchImpactGame } from "./runtime/process-patch-impact.js";
import { createRunStatistics } from "./runtime/run-statistics.js";
import { createSteamClient } from "./steam/steam-client.js";

await Actor.init();

const statistics = createRunStatistics();
const client = createSteamClient();
let exitCode = 0;
let statusMessage;

try {
  const input = normalizeInput((await Actor.getInput()) ?? {});
  statistics.set("gamesRequested", input.steamAppIds.length);
  const reviewLimit = input.mode === "patchImpact" ? input.maxReviewsPerPeriod : input.maxReviewsPerGame;
  log.info(`Collecting up to ${reviewLimit} Steam reviews for ${input.steamAppIds.length} game(s).`);

  for (const appId of input.steamAppIds) {
    try {
      if (input.mode === "patchImpact") {
        const patchResult = await processPatchImpactGame({
          appId,
          input,
          client,
          statistics,
          pushData: (record) => Actor.pushData(record),
        });
        await Actor.setValue(`GAME_${appId}_PATCH_IMPACT_REPORT`, patchResult.report);
        statistics.increment("gamesProcessed");
        log.info(`Saved GAME_${appId}_PATCH_IMPACT_REPORT.`);
        continue;
      }
      const result = await processGame({
        appId,
        input,
        client,
        statistics,
        pushData: (record) => Actor.pushData(record),
      });
      for (const cluster of result.clusters) {
        await Actor.pushData(cluster);
        statistics.increment("clustersPushed");
      }
      if (input.aggregation.enabled && input.mode !== "rawReviews") {
        const report = aggregateGameReport({
          game: result.game,
          records: result.records,
          clusters: result.clusters,
          dateRange: input.dateRange,
        });
        await saveGameReport({
          appId,
          report,
          setValue: (key, value) => Actor.setValue(key, value),
        });
        log.info(`Saved GAME_${appId}_REPORT.`);
      }
      statistics.increment("gamesProcessed");
      log.info(`Finished Steam app ${appId}.`);
    } catch (error) {
      statistics.increment("gamesFailed");
      statistics.increment("errors");
      log.warning(`Steam app ${appId} failed and was skipped: ${error.message}`);
    }
  }

  if (statistics.summary().gamesProcessed === 0) {
    throw new Error("No Steam games were processed successfully.");
  }
} catch (error) {
  exitCode = 1;
  statusMessage = `Steam review collection failed: ${error.message}`;
  statistics.increment("errors");
  log.exception(error, statusMessage);
} finally {
  const summary = statistics.summary();
  await Actor.setValue("RUN_STATS", summary);
  log.info(`Run summary: ${JSON.stringify(summary)}`);
  await Actor.exit({ exitCode, statusMessage });
}
