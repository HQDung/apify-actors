# Apple App Store Feedback Analyzer Prerequisite Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone Apple App Store source Actor that satisfies the cross-platform prerequisite without duplicating external dependencies or losing source provenance.

**Architecture:** Use Apple’s public RSS/JSON customer-review feed with bounded pagination and review-ID deduplication. Normalize records into the existing shared feedback-analysis core contract, attach deterministic/shared analysis, cluster each Apple app independently, and emit cautious release-window reports. Keep the Actor independent from the Apify runtime in its source modules so injected fetch fixtures can test HTTP behavior.

**Tech Stack:** JavaScript ES modules, Node built-in `fetch` and test runner, Apify SDK/CLI, vendored `@project/feedback-analysis-core`.

---

### Task 1: Define failing source and contract tests

**Files:**
- Create: `actors/app-store-feedback-analyzer/test/app-store-source.test.mjs`
- Create: `actors/app-store-feedback-analyzer/test/app-store-contract.test.mjs`
- Create: `actors/app-store-feedback-analyzer/test/app-store-runner.test.mjs`
- Create: `actors/app-store-feedback-analyzer/test/app-store-aggregation.test.mjs`

- [x] **Step 1: Test RSS JSON parsing and pagination**

Cover rating/title/text/date/version/helpful-count extraction, reviewer-identity omission, URL pagination, deduplication, and a later-page HTTP failure that preserves earlier reviews.

- [x] **Step 2: Test input and normalized contract behavior**

Cover numeric IDs, `/id<number>` URLs, English and Vietnamese source dimensions, nullable dates/versions, and required release-impact metadata.

- [x] **Step 3: Run the tests before implementation**

Run: `node --test test/*.test.mjs`.

Expected: fail with missing Apple source modules, proving the tests exercise new behavior.

### Task 2: Implement the source adapter and shared-core boundary

**Files:**
- Create: `actors/app-store-feedback-analyzer/src/app-store/normalize-input.js`
- Create: `actors/app-store-feedback-analyzer/src/app-store/parse-rss-json.js`
- Create: `actors/app-store-feedback-analyzer/src/app-store/collect-reviews.js`
- Create: `actors/app-store-feedback-analyzer/src/app-store/output-records.js`
- Create: `actors/app-store-feedback-analyzer/src/app-store/run-collector.js`
- Create: `actors/app-store-feedback-analyzer/src/core/app-store-contract-adapter.js`
- Create: `actors/app-store-feedback-analyzer/src/analysis/app-store-analysis.js`

- [x] **Step 1: Implement bounded public-feed collection**

Use injectable `fetchImpl`, `AbortController` timeouts, a maximum of 10 pages, stable diagnostics, and scoped `APP_STORE_*` errors. Deduplicate by Apple review ID and return collected records on later-page failure.

- [x] **Step 2: Implement normalized mapping**

Map Apple platform identity, app ID, title/text, date, rating, country, requested locale, app version, helpful count, and nullable developer reply into the existing validated core contract without inventing unavailable fields.

- [x] **Step 3: Wire shared analysis**

Use `analyzeFeedback` with an App Store taxonomy config and assert direct English/Vietnamese analysis results are schema-valid.

### Task 3: Add platform-scoped aggregation and release support

**Files:**
- Create: `actors/app-store-feedback-analyzer/src/aggregation/app-store-aggregation.js`
- Modify: `actors/app-store-feedback-analyzer/src/app-store/run-collector.js`
- Create: `actors/app-store-feedback-analyzer/src/main.js`

- [x] **Step 1: Group aggregation by product app ID**

Build clusters and product reports separately for every requested Apple app; never mix apps in a cluster or report.

- [x] **Step 2: Add observational release windows**

Use non-overlapping before/after windows and preserve the shared core’s non-causal disclaimer.

- [x] **Step 3: Run the direct integration tests**

Run: `node --test test/*.test.mjs`.

Expected: 13 tests pass with 0 failures.

### Task 4: Package and validate the Actor

**Files:**
- Create: `actors/app-store-feedback-analyzer/.actor/actor.json`
- Create: `actors/app-store-feedback-analyzer/.actor/input_schema.json`
- Create: `actors/app-store-feedback-analyzer/.actor/output_schema.json`
- Create: `actors/app-store-feedback-analyzer/.actor/dataset_schema.json`
- Create: `actors/app-store-feedback-analyzer/Dockerfile`
- Create: `actors/app-store-feedback-analyzer/package.json`
- Create: `actors/app-store-feedback-analyzer/package-lock.json`
- Create: `actors/app-store-feedback-analyzer/README.md`
- Create: `actors/app-store-feedback-analyzer/sample-input.json`
- Create: `actors/app-store-feedback-analyzer/sample-benchmark.json`
- Create: `actors/app-store-feedback-analyzer/sample-release-impact.json`
- Create: `actors/app-store-feedback-analyzer/BENCHMARK_NOTES.md`
- Create: `actors/app-store-feedback-analyzer/CHANGELOG.md`

- [x] **Step 1: Validate packaging inputs**

Run: `npm install --ignore-scripts --offline`, `npm run lint`, `npm run format:check`, and `apify validate-schema` from the Actor directory.

Expected: no install vulnerabilities, lint/format clean, and input schema valid.

- [x] **Step 2: Run the Actor locally**

Run: `apify run --input-file sample-input.json`.

Observed: Actor completed with a scoped `APP_STORE_FETCH_ERROR` in the current sandbox; fixture-based HTTP tests remain green, and no cloud coverage claim is made.
