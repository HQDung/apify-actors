import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const fixturePath = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "source-responses",
  "manga-source-spike.json",
);

test("Phase 0 fixture covers the required title-resolution matrix", async () => {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  const cases = fixture.titleMatrix.cases;

  assert.equal(cases.length, 29);
  assert.equal(new Set(cases.map((item) => item.id)).size, cases.length);
  assert.deepEqual(
    new Set(cases.map((item) => item.category)),
    new Set([
      "popular-ongoing",
      "completed",
      "ongoing",
      "hiatus",
      "multi-part",
      "localized-edition",
      "localized-alias",
    ]),
  );
});

test("Phase 0 default path resolves One Piece without auth, proxy, or content downloads", async () => {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  const pathEvidence = fixture.defaultPath;

  assert.equal(pathEvidence.query, "One Piece");
  assert.equal(pathEvidence.marketCode, "US-en");
  assert.equal(pathEvidence.authenticated, false);
  assert.equal(pathEvidence.proxyRequired, false);
  assert.equal(pathEvidence.collectionPolicy.downloadedMangaContent, false);
  assert.equal(pathEvidence.collectionPolicy.followedImageUrls, false);
  assert.equal(pathEvidence.metadata.status, 200);
  assert.equal(pathEvidence.metadata.workId, "38");
  assert.equal(pathEvidence.metadata.canonicalTitle, "One Piece");
  assert.equal(pathEvidence.usPublisher.status, 200);
  assert.equal(pathEvidence.usPublisher.sourceUrl, "https://www.viz.com/manga-books/manga/one-piece/all");
});

test("Phase 0 evidence records source limitations instead of overstating support", async () => {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));

  assert.equal(fixture.collectionPolicy.downloadedMangaContent, false);
  assert.equal(fixture.collectionPolicy.authenticated, false);
  assert.ok(fixture.sourceLimitations.includes("kitsu-commercial-terms-unconfirmed"));
  assert.ok(fixture.sourceLimitations.includes("open-library-commercial-backend-restricted"));
  assert.ok(fixture.sourceLimitations.includes("manga-plus-robots-disallow"));
  assert.ok(fixture.sourceLimitations.includes("wikidata-rate-limit-observed"));
  assert.equal(fixture.productionGate, "blocked_pending_source_permission");
});
