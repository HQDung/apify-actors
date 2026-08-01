import { describe, expect, it } from "vitest";

import { saveGameReport } from "../../src/output/save-game-report.js";

describe("game report output", () => {
  it("uses the stable per-game key", async () => {
    const calls = [];
    await saveGameReport({
      appId: "730",
      report: { recordType: "gameFeedbackReport" },
      setValue: async (...args) => calls.push(args),
    });
    expect(calls).toEqual([["GAME_730_REPORT", { recordType: "gameFeedbackReport" }]]);
  });
});
