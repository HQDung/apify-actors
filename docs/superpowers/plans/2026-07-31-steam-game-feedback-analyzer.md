# Steam Game Feedback Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and validate a standalone Apify Actor that collects public Steam reviews, normalizes them, classifies player feedback, aggregates game reports, clusters duplicate issues, and supports patch-impact comparisons.

**Architecture:** Use a dependency-light JavaScript Actor with an isolated Steam client, deterministic local analysis fallback, optional provider-backed analysis behind an explicit configuration boundary, and schema-first outputs. Preserve raw reviews on every failure, write incremental dataset records, and keep per-game reports in the default key-value store.

**Tech Stack:** JavaScript ES modules, Apify SDK, native `fetch`, Vitest, ESLint, JSON schemas, Apify CLI.

---

### Phase 0: Technical validation

**Files:**
- Create: `actors/steam-game-feedback-analyzer/TECHNICAL_SPIKE.md`
- Create: `actors/steam-game-feedback-analyzer/scripts/fetch-steam-fixture.mjs`
- Create: `actors/steam-game-feedback-analyzer/test/fixtures/steam/*.json`

- [x] Verify `apify --help`, inspect current repository conventions, and choose public test app IDs outside core source.
- [x] Probe the public Steam review endpoint for two games, English/Vietnamese filters, pagination, date fields, purchase metadata, and rate-limit behavior.
- [x] Save sanitized representative response fixtures and document observed endpoint parameters, cursor behavior, missing fields, and limitations.
- [x] Run the fixture script against a small live sample and verify the documented parser assumptions.

Gate: `TECHNICAL_SPIKE.md` records stable pagination and enough fields to implement normalized raw review output; no AI code is started before this gate.

### Phase 1: Raw review Actor

**Files:**
- Create: `actors/steam-game-feedback-analyzer/.actor/{actor.json,input_schema.json,output_schema.json,dataset_schema.json}`
- Create: `actors/steam-game-feedback-analyzer/src/{main.js,config/defaults.js,config/taxonomy.js}`
- Create: `actors/steam-game-feedback-analyzer/src/input/{extract-app-ids.js,normalize-input.js}`
- Create: `actors/steam-game-feedback-analyzer/src/steam/{steam-client.js,normalize-review.js}`
- Create: `actors/steam-game-feedback-analyzer/src/runtime/{errors.js,run-statistics.js}`
- Create: `actors/steam-game-feedback-analyzer/test/unit/*.test.js`
- Create: `actors/steam-game-feedback-analyzer/sample-input.json`

- [x] Write failing unit tests for URL/app-ID extraction, deduplication, input defaults/validation, date and language filters, review normalization, and run statistics.
- [x] Implement native Steam collection with bounded pagination, retry handling, explicit filters, timestamp normalization, and per-game failure isolation.
- [x] Push one normalized review record at a time and save run statistics without depending on final dataset counts.
- [x] Add schema-valid raw output and local input configuration.

Run before Phase 2: `npm test`, `npm run lint`, `npm run build`, `npm run validate:schema`, `apify run --purge` with a small raw input, then inspect local dataset JSON.

### Phase 2: Review-level analysis

**Files:**
- Create: `actors/steam-game-feedback-analyzer/src/analysis/{analysis-schema.js,analyze-review.js,fallback-analysis.js,validate-analysis.js}`
- Modify: `actors/steam-game-feedback-analyzer/src/main.js`
- Modify: `actors/steam-game-feedback-analyzer/.actor/{output_schema.json,dataset_schema.json}`
- Create: `actors/steam-game-feedback-analyzer/test/fixtures/reviews/*.json`
- Create: `actors/steam-game-feedback-analyzer/test/unit/analysis.test.js`

- [x] Add fixture tests for crash, generic complaint, praise, feature request, performance, controller, Steam Deck, localization, Vietnamese, short, joke, and mixed reviews.
- [x] Implement deterministic analysis for the supported English/Vietnamese MVP taxonomy, strict validation, confidence/actionability scoring, and careful “reported/suggested” wording.
- [x] Keep analysis provider-independent; failed analysis emits raw review plus `analysisStatus: failed` and a short error code.
- [x] Add analysis controls and cost statistics without changing raw mode behavior.

Run before Phase 3: focused analysis tests, full unit suite, lint/build/schema validation, and a 20-review live feedback-analysis smoke run with output inspection.

### Phase 3: Aggregated reports

**Files:**
- Create: `actors/steam-game-feedback-analyzer/src/aggregation/{aggregate-game-report.js,calculate-topic-stats.js}`
- Modify: `actors/steam-game-feedback-analyzer/src/main.js`
- Modify: `actors/steam-game-feedback-analyzer/.actor/{output_schema.json,dataset_schema.json}`
- Create: `actors/steam-game-feedback-analyzer/test/unit/aggregation.test.js`

- [x] Write failing tests for review counts, language counts, positive/negative topic ranking, top issue/request ranking, and partial-analysis validity.
- [x] Implement per-game aggregation from in-memory normalized records, save `GAME_<APP_ID>_REPORT`, and preserve report provenance/window metadata.
- [x] Emit report-generation failures as run errors while preserving review records.

Run before Phase 4: aggregation tests, full suite, schema validation, and a small multi-game analysis run; verify report counts against dataset records.

### Phase 4: Duplicate issue clustering

**Files:**
- Create: `actors/steam-game-feedback-analyzer/src/clustering/{cluster-reviews.js,cluster-id.js}`
- Modify: `actors/steam-game-feedback-analyzer/src/main.js`
- Modify: `actors/steam-game-feedback-analyzer/src/aggregation/aggregate-game-report.js`
- Modify: `actors/steam-game-feedback-analyzer/.actor/{output_schema.json,dataset_schema.json}`
- Create: `actors/steam-game-feedback-analyzer/test/unit/clustering.test.js`

- [x] Add tests proving same-game/topic-compatible issue variants cluster, unrelated topics stay separate, and game/type partitions prevent cross-game merges.
- [x] Implement debuggable token/topic similarity clustering with stable IDs, canonical titles, confidence, dates, languages, and review IDs; keep an embedding-provider seam but do not require a new dependency.
- [x] Push `feedbackCluster` records and link review records to cluster IDs where assigned.

Run before Phase 5: clustering tests, full suite, schema validation, and a multi-game analysis run with cluster coherence checks.

### Phase 5: Publish readiness

**Files:**
- Create/modify: `actors/steam-game-feedback-analyzer/{README.md,BENCHMARK_NOTES.md,CHANGELOG.md}`
- Modify: `actors/steam-game-feedback-analyzer/{sample-input.json,.actor/input_schema.json,.actor/output_schema.json,.actor/dataset_schema.json}`
- Create: `actors/steam-game-feedback-analyzer/validation/benchmark-report.md`

- [x] Document modes, inputs, outputs, taxonomy, language behavior, cost controls, limitations, privacy/compliance, responsible use, FAQ, and roadmap.
- [x] Run static Actor validation before any benchmark or cloud action.
- [x] Run local raw, analysis, multi-language, multi-game, and patch-impact-compatible smoke inputs; record runtime, counts, failure rates, cost estimates, and manual quality review.
- [x] Confirm no pricing changes and no automatic publish; stop at a reviewed, validated release candidate unless the user separately authorizes deployment.

Run before Phase 6: full regression, static validation, README/schema/sample consistency checks, and benchmark review.

### Phase 6: Patch impact mode

**Files:**
- Modify: `actors/steam-game-feedback-analyzer/src/input/normalize-input.js`
- Create: `actors/steam-game-feedback-analyzer/src/aggregation/patch-impact.js`
- Modify: `actors/steam-game-feedback-analyzer/src/main.js`
- Modify: `actors/steam-game-feedback-analyzer/.actor/{input_schema.json,output_schema.json,dataset_schema.json}`
- Create: `actors/steam-game-feedback-analyzer/test/unit/patch-impact.test.js`

- [x] Add failing tests for patch-date validation, before/after windows, topic deltas, new issue detection, improved-topic detection, and “possible regression” wording.
- [x] Implement bounded before/after collection using the existing date filters, reuse analysis and clustering outputs, and write one patch-impact report per game.
- [x] Keep causal claims out of the report and mark unsupported comparisons as insufficient data.

Final gate: `npm test`, `npm run lint`, `npm run build`, `npm run validate:schema`, `npm run validate:actor`, and a live bounded smoke run for each supported mode. Do not publish automatically.
