import { createClusterId } from "@project/feedback-analysis-core";
import { describe, expect, it } from "vitest";

import { clusterReviews } from "../../src/clustering/cluster-reviews.js";

const record = ({ id, appId = 730, type = "bugReport", title, topics, language = "english", createdAt = "2026-07-20T10:00:00.000Z", severity = "high" }) => ({
  recordType: "review",
  game: { steamAppId: appId, name: appId === 730 ? "Counter-Strike 2" : "Dota 2" },
  review: { reviewId: id, language, createdAt, text: `${id} text`, recommended: false },
  analysisStatus: "success",
  analysis: {
    isActionableFeedback: true,
    actionabilityScore: 0.9,
    primaryFeedbackType: type,
    feedbackTypes: [type],
    sentiment: "negative",
    severity,
    topics,
    summary: title,
    issue: type === "featureRequest" ? null : { title, triggerSignals: [] },
    featureRequest: type === "featureRequest" ? { title } : null,
  },
});

describe("duplicate issue clustering", () => {
  it("groups similar same-game issue variants and preserves review links", () => {
    const result = clusterReviews({
      records: [
        record({ id: "1", title: "Game crashes when opening the inventory", topics: ["crashes", "inventory"] }),
        record({ id: "2", title: "Inventory menu causes a crash", topics: ["crashes", "inventory"] }),
        record({ id: "3", title: "The frame rate stutters in crowded areas", topics: ["stuttering", "frameRate"], severity: "medium" }),
      ],
      minimumClusterSize: 2,
    });

    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0]).toMatchObject({
      recordType: "feedbackCluster",
      feedbackType: "bugReport",
      mentionCount: 2,
      uniqueReviewCount: 2,
      reviewIds: ["1", "2"],
      topics: expect.arrayContaining(["crashes", "inventory"]),
      clusterConfidence: expect.any(Number),
    });
    expect(result.reviewClusterIds).toMatchObject({ "1": result.clusters[0].clusterId, "2": result.clusters[0].clusterId });
    expect(result.reviewClusterIds["3"]).toBeUndefined();
  });

  it("keeps feedback types and games in separate partitions", () => {
    const records = [
      record({ id: "bug", title: "Game crashes in inventory", topics: ["crashes", "inventory"] }),
      record({ id: "request", type: "featureRequest", title: "Add inventory sorting", topics: ["inventory"] }),
      record({ id: "other-game", appId: 570, title: "Game crashes in inventory", topics: ["crashes", "inventory"] }),
    ];
    const result = clusterReviews({ records, minimumClusterSize: 1 });
    expect(result.clusters).toHaveLength(3);
    expect(new Set(result.clusters.map((cluster) => cluster.game.steamAppId))).toEqual(new Set([730, 570]));
    expect(result.clusters.find((cluster) => cluster.feedbackType === "featureRequest")).toBeTruthy();
  });

  it("creates stable IDs from game, feedback type, and canonical title", () => {
    expect(createClusterId({ productId: 730, feedbackType: "bugReport", title: "Crash when opening inventory" })).toBe("issue-730-bugreport-crash-when-opening-inventory");
  });
});
