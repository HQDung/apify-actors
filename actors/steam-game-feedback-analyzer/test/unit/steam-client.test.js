import { describe, expect, it } from "vitest";

import {
  buildReviewsUrl,
  createSteamClient,
  isReviewInDateRange,
} from "../../src/steam/steam-client.js";

const responseFor = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("Steam review client", () => {
  it("URL-encodes cursors and maps product filters to Steam parameters", () => {
    const url = buildReviewsUrl({
      appId: "730",
      language: "english",
      reviewFilter: "negative",
      purchaseType: "nonSteamPurchasers",
      cursor: "AoJ4q/jd258DdI/98wY=",
      numPerPage: 100,
    });
    expect(url).toContain("review_type=negative");
    expect(url).toContain("purchase_type=non_steam_purchase");
    expect(url).toContain("cursor=AoJ4q%2Fjd258DdI%2F98wY%3D");
    expect(url).toContain("num_per_page=100");
  });

  it("follows cursors, de-duplicates review IDs, and stops at the limit", async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(String(url));
      const page = calls.length === 1
        ? { success: 1, cursor: "next/cursor=", reviews: [{ recommendationid: "1" }, { recommendationid: "2" }] }
        : { success: 1, cursor: "unused", reviews: [{ recommendationid: "2" }, { recommendationid: "3" }] };
      return responseFor(page);
    };
    const client = createSteamClient({ fetchImpl, sleep: async () => {} });

    const reviews = await client.fetchReviews({
      appId: "730",
      languages: ["english"],
      reviewFilter: "all",
      purchaseType: "all",
      maxReviews: 3,
    });

    expect(reviews.map(({ recommendationid }) => recommendationid)).toEqual(["1", "2", "3"]);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("cursor=next%2Fcursor%3D");
  });

  it("retries transient HTTP failures and does not retry a 404", async () => {
    let transientAttempts = 0;
    const transientClient = createSteamClient({
      fetchImpl: async () => {
        transientAttempts += 1;
        if (transientAttempts === 1) return new Response("busy", { status: 503 });
        return responseFor({ success: 1, cursor: "", reviews: [] });
      },
      sleep: async () => {},
    });
    await expect(
      transientClient.fetchReviews({ appId: "730", languages: ["english"], maxReviews: 1 }),
    ).resolves.toEqual([]);
    expect(transientAttempts).toBe(2);

    let deterministicAttempts = 0;
    const deterministicClient = createSteamClient({
      fetchImpl: async () => {
        deterministicAttempts += 1;
        return new Response("missing", { status: 404 });
      },
      sleep: async () => {},
    });
    await expect(
      deterministicClient.fetchReviews({ appId: "730", languages: ["english"], maxReviews: 1 }),
    ).rejects.toThrow(/404/);
    expect(deterministicAttempts).toBe(1);
  });

  it("applies inclusive date bounds to Unix review timestamps", () => {
    expect(
      isReviewInDateRange(
        { timestamp_created: 1782864000 },
        { from: "2026-07-01T00:00:00.000Z", to: "2026-07-31T00:00:00.000Z" },
      ),
    ).toBe(true);
    expect(
      isReviewInDateRange(
        { timestamp_created: 1780272000 },
        { from: "2026-07-01T00:00:00.000Z", to: null },
      ),
    ).toBe(false);
  });
});
