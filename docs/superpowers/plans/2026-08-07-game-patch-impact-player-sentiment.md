# Game Patch Impact & Player Sentiment Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a bounded, coverage-aware Steam patch-impact intelligence Actor with deterministic sentiment and shared-core theme analysis.

**Architecture:** A new JavaScript Actor collects Steam reviews/news through finite HTTP adapters, maps reviews into the shared feedback-analysis core, analyzes BEFORE/AFTER periods independently, and emits one decision-oriented dataset report per App ID. The existing generic Steam review Actor remains unchanged.

**Tech Stack:** Node.js 22, Apify SDK 3, native `fetch`, `@project/feedback-analysis-core` vendored tarball, Vitest, ESLint, Apify schemas, and `apify run`.

---

## File map

Create all Actor files under `actors/game-patch-impact-player-sentiment/`:

- `.actor/actor.json`, `input_schema.json`, `dataset_schema.json`, `output_schema.json`: Apify metadata and contracts.
- `src/config.js`, `src/input/normalize-input.js`: defaults and runtime validation.
- `src/adapters/steam-reviews.js`, `steam-news.js`, `game-metadata.js`: external source boundaries.
- `src/core/feedback-core-adapter.js`: shared-core contract adapter and gaming fallback taxonomy.
- `src/domain/*.js`: pure window, coverage, patch, sampling, sentiment, theme, and confidence logic.
- `src/services/*.js`: collection, period analysis, and game-impact orchestration.
- `src/output/report-builder.js`, `src/main.js`: output and Apify lifecycle.
- `test/*.test.mjs`, `tests/fixtures/*.json`: unit/fixture tests.
- `README.md`, `BENCHMARK_NOTES.md`, `sample-input.json`, `storage/key_value_stores/default/INPUT.json`, `CHANGELOG.md`: product docs and reproducible inputs.
- `docs/phase-1-report.md` through `docs/phase-6-report.md`, `docs/phase-5-quality-report.md`, `docs/publish-readiness-report.md`: phase evidence and release decisions.

Modify only the repository-level documentation/plan files and add the new Actor; do not modify the existing Steam Actor or the shared core unless a test proves a minimal packaging fix is required.

## Task 1: Phase 1 scaffold and input contract

**Files:** Create the new Actor package, Apify metadata, runtime config, input normalizer, and input tests.

- [ ] **Step 1: Create the failing input tests.** Add `test/input-normalize.test.mjs` with assertions that `normalizeInput({})` returns the approved defaults, numeric IDs become strings, IDs outside 1–10 or non-numeric IDs fail, `windowDays` and `maxReviewsPerPeriod` ranges are enforced, unsupported languages fail, and `custom_patch_date` without `patchDate` fails with a clear message.
- [ ] **Step 2: Run the input tests and verify RED.** Run `npx vitest run test/input-normalize.test.mjs`; expect module-not-found or missing-export failures because the new Actor source does not exist.
- [ ] **Step 3: Add the minimal package and runtime files.** Create `package.json` with `apify`, the vendored core package, Vitest, ESLint, Prettier, and scripts `build`, `lint`, `test`, `format:check`, `validate:schema`; create `src/config.js` with `DEFAULT_INPUT`, `MAX_SCAN_PAGES_PER_GAME=30`, `REVIEWS_PER_PAGE=100`, `MAX_NEWS_ITEMS=20`, `HTTP_TIMEOUT_MS=15000`, `MAX_RETRIES=3`, `RETRY_BASE_MS=500`, `MAX_CONCURRENT_GAMES=3`, `MIN_REVIEWS_PER_PERIOD=8`, and `PATCH_CONFIDENCE_THRESHOLD=0.65`; implement `normalizeInput` with the exact validation assertions from Step 1.
- [ ] **Step 4: Run the input tests and verify GREEN.** Run `npm install` in the Actor, then `npx vitest run test/input-normalize.test.mjs`; expect all input tests to pass.
- [ ] **Step 5: Add Actor metadata and packaging.** Create `.actor/actor.json` with `meta.generatedBy` set to `Codex with GPT-5`, `name: game-patch-impact-player-sentiment`, the phase-appropriate title, `version: 0.1`, and Dockerfile wiring; create `Dockerfile` from `apify/actor-node:22`; run `node ../../scripts/package-feedback-core.mjs .` from the Actor directory and confirm `vendor/project-feedback-analysis-core-1.0.0.tgz` exists.
- [ ] **Step 6: Commit the scaffold.** Run `git diff --check`, `npm run build`, and `git status --short`; commit only the new Actor scaffold and Phase 1 tests with `git add actors/game-patch-impact-player-sentiment && git commit -m "feat: scaffold patch impact actor"`.

## Task 2: Phase 1 review collection, normalization, windows, and coverage

**Files:** Create `src/domain/comparison-window.js`, `coverage.js`, `sampling.js`, `src/adapters/steam-reviews.js`, `src/adapters/game-metadata.js`, and tests/fixtures for the collection contract.

- [ ] **Step 1: Write failing pure-domain tests.** Add `test/comparison-window.test.mjs`, `test/coverage.test.mjs`, and `test/sampling.test.mjs` covering rolling/custom windows, exact boundary assignment to AFTER, full/partial/insufficient coverage, page-limit warnings, deterministic output for the same seed, and independent period caps.
- [ ] **Step 2: Run pure-domain tests and verify RED.** Run `npx vitest run test/comparison-window.test.mjs test/coverage.test.mjs test/sampling.test.mjs`; expect missing-module failures.
- [ ] **Step 3: Implement pure-domain functions.** Implement `resolveComparisonWindow({ mode, windowDays, patchDate, now, patchBoundary })`, `assignReviewPeriod(createdAt, windows)`, `buildPeriodCoverage`, and `sampleDeterministically` using ISO timestamps, half-open BEFORE bounds, stable seed hashing, and bounded reservoir/even sampling.
- [ ] **Step 4: Run pure-domain tests and verify GREEN.** Re-run the three test files and expect all assertions to pass.
- [ ] **Step 5: Write failing adapter tests.** Add `test/steam-reviews.test.mjs` and sanitized fixtures `tests/fixtures/steam-reviews-page-1.json`, `steam-reviews-page-2.json`, and `steam-reviews-empty.json` covering URL-encoded cursors, `filter=recent`, `num_per_page=100`, off-topic mapping, retries, malformed responses, repeated cursors, page limits, descending timestamps, normalization of all handoff fields, and collection reaching BEFORE.
- [ ] **Step 6: Run adapter tests and verify RED.** Run `npx vitest run test/steam-reviews.test.mjs`; expect missing adapter exports.
- [ ] **Step 7: Implement the adapters.** Implement `buildReviewsUrl`, `fetchReviewPage`, `iterateRecentReviews`, `normalizeSteamReview`, `fetchGameMetadata`, and the bounded retry helper. Return `ReviewCollection` counters and coverage inputs without retaining author names, avatars, profile URLs, or unbounded raw pages.
- [ ] **Step 8: Run adapter tests and verify GREEN.** Run `npx vitest run test/steam-reviews.test.mjs`; expect all collection/normalization tests to pass.

## Task 3: Phase 1 Actor collection smoke and report

**Files:** Create `src/services/collect-game-feedback.js`, `src/main.js`, `sample-input.json`, local `storage/.../INPUT.json`, and `docs/phase-1-report.md`.

- [ ] **Step 1: Write the failing collection-service test.** Add `test/collect-game-feedback.test.mjs` asserting that a valid game returns independent BEFORE/AFTER normalized arrays, coverage for both periods, and finite stats, while a review endpoint failure returns a per-game failure object rather than throwing through a multi-game loop.
- [ ] **Step 2: Run the service test and verify RED.** Run `npx vitest run test/collect-game-feedback.test.mjs`; expect missing-module failures.
- [ ] **Step 3: Implement collection orchestration and temporary Phase 1 storage.** Call metadata, resolve rolling/custom windows, collect until the boundary, sample each period to `maxReviewsPerPeriod`, and store the bounded collection snapshot under `GAME_<APP_ID>_COLLECTION` for the Phase 1 gate. `main.js` must call `Actor.init`, process each App ID independently, push a collection-only dataset item, set `RUN_STATS`, and exit successfully when at least one game produces a collection.
- [ ] **Step 4: Run service and local smoke tests.** Run `npx vitest run`, `npm run build`, `npm run lint`, `npm run validate:schema`, and `APIFY_LOCAL_STORAGE_DIR=/tmp/game-patch-impact-phase1 apify run --purge` with the default sample. Inspect the local key-value record and verify normalized samples plus coverage are present.
- [ ] **Step 5: Write the phase report before continuing.** Record commands, test counts, default runtime, review pages, scanned/analyzed samples, coverage, warnings, and unresolved risks in `docs/phase-1-report.md`. Run `git diff --check` and commit Phase 1 with `git commit -m "feat: add bounded Steam collection"`.

## Task 4: Phase 2 patch detection and fallback

**Files:** Create `src/adapters/steam-news.js`, `src/domain/patch-detector.js`, `src/domain/patch-boundary.js`, `test/patch-detector.test.mjs`, news fixtures, and `docs/phase-2-report.md`; modify collection orchestration to resolve `latest_patch`.

- [ ] **Step 1: Write failing patch fixtures/tests.** Add fixtures for an obvious patch, hotfix, major update, sale, community event, external article, empty news, and timeout. Test title/content scoring, negative signals, source signal handling, threshold acceptance at 0.65, and fallback metadata.
- [ ] **Step 2: Run patch tests and verify RED.** Run `npx vitest run test/patch-detector.test.mjs`; expect missing-module failures.
- [ ] **Step 3: Implement patch retrieval and detection.** Implement `fetchGameNews` with a 20-item cap and retry/timeout handling; implement deterministic weighted signals and `resolveComparisonBoundary` so low-confidence/no-news results preserve `requestedComparisonMode=latest_patch`, set `effectiveComparisonMode=recent_vs_previous`, and emit `PATCH_DETECTION_FALLBACK`.
- [ ] **Step 4: Run patch tests and verify GREEN.** Run the patch test file plus the full Actor suite; expect all tests to pass and news failures to be represented as fallback behavior.
- [ ] **Step 5: Run and report Phase 2.** Execute local `latest_patch` with a fixture-backed unit test and a bounded live smoke against `646570`; record the accepted/fallback candidate, news request count, and warnings in `docs/phase-2-report.md`; commit `feat: add Steam patch detection fallback`.

## Task 5: Phase 3 shared-core analysis integration

**Files:** Create `src/domain/game-taxonomy.js`, `src/core/feedback-core-adapter.js`, `src/services/analyze-period.js`, `test/feedback-core-adapter.test.mjs`, `test/analyze-period.test.mjs`, and `docs/phase-3-report.md`.

- [ ] **Step 1: Write failing analysis tests.** Test that normalized Steam feedback passes `validateNormalizedFeedback`, Steam `voted_up` becomes the only primary sentiment signal, deterministic game themes and feature requests are extracted, language distributions are counted, evidence is capped at two per theme and omitted when disabled, and the same period produces byte-stable analysis apart from timestamps.
- [ ] **Step 2: Run analysis tests and verify RED.** Run `npx vitest run test/feedback-core-adapter.test.mjs test/analyze-period.test.mjs`; expect missing exports.
- [ ] **Step 3: Implement the thin core adapter.** Define the gaming taxonomy and keyword mapping outside the shared package; call `analyzeFeedback` with `@project/feedback-analysis-core`, a validated normalized feedback object, and a deterministic gaming fallback that returns only allowed analysis fields. Implement `analyzePeriod` with positive/negative counts, rates, theme metrics, feature requests, language counts, negative shares, and bounded evidence.
- [ ] **Step 4: Run analysis tests and verify GREEN.** Run both test files and the repository `npm run test:core`; expect the new adapter and shared core contracts to pass.
- [ ] **Step 5: Run manual fixture validation and report.** Analyze one mostly positive, one mixed, and one bug/performance-heavy fixture; inspect the structured themes and evidence; record findings and any taxonomy limitations in `docs/phase-3-report.md`; commit `feat: integrate shared feedback analysis core`.

## Task 6: Phase 4 comparison engine and final report

**Files:** Create `src/domain/sentiment-delta.js`, `theme-delta.js`, `confidence.js`, `src/services/analyze-game-impact.js`, `src/output/report-builder.js`, `test/sentiment-delta.test.mjs`, `test/theme-delta.test.mjs`, `test/confidence.test.mjs`, `test/report-builder.test.mjs`, and `docs/phase-4-report.md`; replace collection-only output in `src/main.js`.

- [ ] **Step 1: Write failing comparison tests.** Cover all sentiment direction thresholds, decimal/percentage-point deltas, new issue/regression/improvement safeguards, feature request comparison, insufficient-data behavior, confidence caps, warning propagation, deterministic summaries, and `includeEvidence=false`.
- [ ] **Step 2: Run comparison tests and verify RED.** Run `npx vitest run test/sentiment-delta.test.mjs test/theme-delta.test.mjs test/confidence.test.mjs test/report-builder.test.mjs`; expect missing-module failures.
- [ ] **Step 3: Implement comparison and report functions.** Implement `compareSentiment`, `compareThemes`, `detectNewIssues`, `detectRegressions`, `detectImprovements`, `compareFeatureRequests`, `calculateConfidence`, and `buildReport`. Use `insufficient_data` when either period has fewer than eight analyzed reviews; cap partial/insufficient confidence; generate one to three deterministic summary sentences without causal claims.
- [ ] **Step 4: Run comparison tests and verify GREEN.** Run the four comparison test files and the full Actor suite; expect all tests to pass.
- [ ] **Step 5: Wire final runtime behavior.** Process up to three games concurrently, push exactly one report dataset item per App ID, push failed/partial items for recoverable per-game errors, set `RUN_STATS`, and retain no collection snapshot in final output.
- [ ] **Step 6: Run Phase 4 local matrix and report.** Run default, latest-patch fallback, custom-date, multi-game, and invalid-App-ID fixtures locally; record output examples, runtime, coverage, warnings, and remaining risks in `docs/phase-4-report.md`; commit `feat: build patch impact intelligence report`.

## Task 7: Phase 5 Apify productization and QA

**Files:** Create/modify `.actor/*.json`, `README.md`, `sample-input.json`, `storage/key_value_stores/default/INPUT.json`, `BENCHMARK_NOTES.md`, `CHANGELOG.md`, `test/dockerfile-packaging.test.mjs`, `test/publish-readiness.test.mjs`, `docs/phase-5-quality-report.md`, and `docs/phase-5-report.md`.

- [ ] **Step 1: Write schema and packaging tests.** Assert input defaults/limits, output fields/templates, dataset overview columns, actor metadata, Dockerfile dependency installation, and no browser/secret requirement.
- [ ] **Step 2: Run QA tests and verify RED where new contracts are absent.** Run `npx vitest run test/dockerfile-packaging.test.mjs test/publish-readiness.test.mjs`; fix only test setup errors before implementing missing contracts.
- [ ] **Step 3: Implement all schemas and product copy.** Add schemaVersion 1 input with conditional runtime validation, output schema with dataset/run-stat links, dataset schema with decision-oriented nested fields, README differentiation/limitations/API example/pricing guidance, stable sample inputs, and benchmark notes. Set memory to 256 MB unless measured otherwise.
- [ ] **Step 4: Validate and run the full local matrix.** Run `npm test`, `npm run build`, `npm run lint`, `npm run format:check`, `apify validate-schema`, and bounded `apify run` inputs for default, latest patch, custom date, multiple games, and invalid ID. Inspect dataset JSON and `RUN_STATS`; confirm no unhandled rejection and at least one item for the default.
- [ ] **Step 5: Validate the Actor release files.** Run the Actor's release validator after aligning it to the new report fields, run `git diff --check`, and record build, unit, integration, local runtime, scanned/analyzed counts, coverage, memory, warnings, and blockers in both phase and quality reports.
- [ ] **Step 6: Commit Phase 5.** Commit the verified schemas/docs/tests with `git commit -m "feat: productize game patch impact actor"`; do not push or publish yet.

## Task 8: Phase 6 cloud validation, readiness, and publication

**Files:** Modify `BENCHMARK_NOTES.md`, create/update `docs/publish-readiness-report.md` and `docs/phase-6-report.md`.

- [ ] **Step 1: Run final local verification.** Re-run the full Actor tests, lint, build, schema validation, and default `apify run`; inspect the exact report shape and confirm the current branch diff contains no unrelated changes.
- [ ] **Step 2: Push the Actor build.** Run `apify push` from the new Actor directory only after local verification succeeds; capture the build ID and do not modify pricing automatically.
- [ ] **Step 3: Run the cloud default and matrix checks.** Execute the exact default input in Apify Cloud, then latest-patch, custom-date, multi-game, and invalid-ID smoke inputs as cost-bounded runs. Inspect run status, dataset item count, report fields, warnings, runtime, memory, and usage cost.
- [ ] **Step 4: Write the readiness decision.** Record READY or READY WITH NOTES only when the default cloud run succeeds, schemas are valid, coverage is never overstated, fallback is visible, and no critical blocker remains. Include store metadata and the recommended `$0.03/game_report` starting principle without changing pricing automatically.
- [ ] **Step 5: Publish only after the readiness gate.** Because the user explicitly authorized publication after a successful cloud test, publish the verified Actor through the approved workflow; otherwise stop with the readiness report and request direction. Create only stable, useful store examples supported by the current API.
- [ ] **Step 6: Verify post-publish behavior and report.** Run one post-publish default call, confirm dataset/report output, append the result to `BENCHMARK_NOTES.md` and `docs/phase-6-report.md`, and commit `docs: record publication validation`.

