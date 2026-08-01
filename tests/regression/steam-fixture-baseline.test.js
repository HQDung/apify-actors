import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compareSteamOutputs, readSteamSnapshot } from "../../scripts/compare-steam-output.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/steam-before-refactor");

test("captured Steam baseline contains reviews, cluster links, and report totals", async () => {
  const snapshot = await readSteamSnapshot(root);
  const reviews = snapshot.records.filter((record) => record.recordType === "review");
  const clusters = snapshot.records.filter((record) => record.recordType === "feedbackCluster");
  const report = snapshot.reports.GAME_730_REPORT;

  assert.equal(reviews.length, 10);
  assert.equal(clusters.length, 1);
  assert.ok(reviews.every((record) => record.source.platform === "steam"));
  assert.ok(clusters.every((cluster) => cluster.reviewIds.every((id) => reviews.some((review) => review.review.reviewId === id))));
  assert.equal(report.statistics.reviewsCollected, reviews.length);
  assert.equal(report.statistics.reviewsAnalyzed, reviews.filter((record) => record.analysisStatus === "success").length);
  assert.equal(compareSteamOutputs(snapshot, snapshot).valid, true);
});

test("baseline fixture file count is deterministic", async () => {
  const files = await readdir(path.join(root, "dataset"));
  assert.equal(files.filter((file) => file.endsWith(".json")).length, 11);
});

