#!/usr/bin/env node

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (!value.startsWith("--")) continue;
  args.set(value.slice(2), process.argv[index + 1]);
  index += 1;
}

const appId = String(args.get("app-id") ?? "730");
const language = String(args.get("language") ?? "english");
const pages = Math.max(1, Number(args.get("pages") ?? 2));
const reviewsPerPage = Math.min(3, Math.max(1, Number(args.get("reviews") ?? 3)));

const requestPage = async (cursor) => {
  const params = new URLSearchParams({
    json: "1",
    filter: "recent",
    language,
    review_type: "all",
    purchase_type: "all",
    num_per_page: String(reviewsPerPage),
    cursor,
  });
  const url = `https://store.steampowered.com/appreviews/${encodeURIComponent(appId)}?${params}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "steam-game-feedback-analyzer-technical-spike/0.1",
    },
  });
  if (!response.ok) throw new Error(`Steam returned HTTP ${response.status}`);
  const body = await response.json();
  if (body.success !== 1) throw new Error("Steam returned success=0");
  return { url, body };
};

const pagesOut = [];
let cursor = "*";
for (let page = 0; page < pages; page += 1) {
  const result = await requestPage(cursor);
  pagesOut.push({
    url: result.url,
    success: result.body.success,
    query_summary: result.body.query_summary,
    cursor: result.body.cursor,
    reviews: result.body.reviews,
  });
  if (!result.body.cursor || result.body.reviews.length === 0) break;
  cursor = result.body.cursor;
}

process.stdout.write(`${JSON.stringify({ appId, language, pages: pagesOut }, null, 2)}\n`);
