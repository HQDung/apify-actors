# Healthy Restaurants Phase 6 Design

**Date:** 2026-07-29

**Goal:** Harden the Phase 1–5 Healthy Restaurants & Menu Intelligence Actor for reliable Version 1 operation, produce measured local/cloud benchmark evidence, and prepare its documentation and Store metadata without adding product features.

## Constraints and acceptance criteria

- Preserve the Phase 5 contract and confirm `validation/phase-5/validation-report.md` remains `READY_FOR_PHASE_6` before implementation.
- Do not add PDF parsing, OCR, image processing, nutrition estimation, medical recommendations, allergen-safety guarantees, review/social scraping, delivery integrations, multi-location support, price monitoring, schedules, alerts, or new discovery sources.
- Keep the public input schema simple. Existing public fields remain the source of truth; reliability knobs are internal constants unless a timeout/limit already belongs in the supported contract.
- Do not auto-publish or change pricing. Cloud benchmarking may use an already available authenticated Actor version; deploying new code requires explicit user authorization and must not be inferred from the benchmark request.
- A single discovery job, restaurant, website, or menu page failure must not terminate sibling work or invalidate otherwise valid partial records.
- Every emitted dataset record must pass the existing output validator and schema.
- The final Phase 6 report contains exactly one of `READY_TO_PUBLISH`, `NEEDS_PHASE_6_FIXES`, or `BLOCKED`.

## Current architecture

`src/main.js` owns Actor lifecycle, Playwright discovery, restaurant detail extraction, website/menu enrichment, validation, dataset writes, and final logging. `src/concurrency.js` batches discovery details and website enrichment. `src/discovery/` uses Playwright contexts per job/restaurant. `src/website/` uses `fetch` with manual redirects and response-body timeouts. `src/menu/` parses supported HTML and returns isolated page results. Phase 5 dietary, nutrition, classification, and schema modules already preserve provenance and safe null behavior.

The implementation will keep these boundaries. Reliability policy and run statistics will be extracted into focused modules instead of introducing a new crawler framework or changing menu parsing behavior.

## Design

### Reliability policy

Create a small internal runtime policy module, for example `src/runtime/reliability.js`, with:

- bounded defaults for discovery navigation timeout, website/menu request timeout, redirect count, retry attempts, retry delay, browser concurrency, and website/menu concurrency;
- transient-error classification for network resets, aborts/timeouts, and retryable HTTP statuses (`408`, `425`, `429`, and `5xx`);
- deterministic-error classification for invalid URLs, unsupported formats, redirect-limit violations, `4xx` responses other than retryable statuses, and parse/validation errors;
- a retry wrapper that retries only transient failures with capped exponential backoff and never retries deterministic failures;
- a bounded response-body reader that uses the existing timeout behavior and releases references after parsing.

The existing manual redirect loop remains in place, but receives the shared policy and records redirect-limit failures using the standard error category. Navigation calls use the same bounded timeout constants. Retry attempts remain small and internal so the Actor cannot multiply external load unexpectedly.

### Concurrency, limits, and cleanup

Centralize internal defaults in one module and pass them explicitly to existing functions:

- Playwright discovery/detail batches: `4`;
- website enrichment batches: `3`;
- maximum menu pages per restaurant: existing validated input, default `3`;
- maximum menu items per restaurant: existing validated input, default `200`;
- maximum restaurants after deduplication: existing validated input, default `30`;
- website/menu response timeout: `30,000 ms`;
- Google Maps navigation timeout: `60,000 ms`;
- redirect limit: `3`;
- retry attempts: `2` total attempts for transient requests.

Every created Playwright context remains closed in `finally`, including discovery-job and detail failures. Browser closure remains in Actor `finally`. Menu page processing continues one candidate at a time so a failed page cannot prevent later candidates from being attempted. Large HTML strings are scoped to one operation and are not copied into output records; only normalized text and provenance fields already required by the contract survive.

### Error categories and isolation

Normalize operational errors to the Phase 6 categories where they cross module boundaries:

`DISCOVERY_FAILED`, `WEBSITE_UNREACHABLE`, `WEBSITE_BLOCKED`, `MENU_NOT_FOUND`, `MENU_UNSUPPORTED_FORMAT`, `MENU_EXTRACTION_FAILED`, `DIETARY_LABEL_AMBIGUOUS`, `NUTRITION_PARSE_FAILED`, `NUTRITION_VALUE_INVALID`, `HEALTHY_CLASSIFICATION_INSUFFICIENT_EVIDENCE`, and `OUTPUT_VALIDATION_FAILED`.

Existing public warnings/errors remain structured objects with understandable messages and source URLs. The mapping must not expose response bodies, credentials, cookies, or excessive scraped content. Place-detail failures return a partial normalized restaurant; website/menu failures return the existing valid menu status and preserve the restaurant. Output validation failures are counted and logged; they may terminate only that record or the run according to the existing validator boundary, but no malformed record may be pushed.

### Aggregate run statistics

Create an internal statistics collector, for example `src/runtime/run-statistics.js`, with counters for:

- search jobs, raw places, deduplicated restaurants, processed restaurants;
- websites available/reachable;
- menu URLs found, HTML menus processed, menus extracted, extracted-empty menus, unsupported menus, menu failures;
- raw menu items, deduplicated items, limited items;
- items with dietary tags, items with published nutrition;
- healthy-focused, uncertain, and not-healthy-focused restaurants;
- warnings, errors, results pushed, and runtime.

The collector exposes increment methods and a final immutable summary. `main.js` updates it at stage boundaries and logs one concise JSON summary at completion. The dataset schema is not expanded solely for metrics. The exact summary is captured by benchmark scripts or validation notes so local and cloud measurements remain auditable.

### Benchmarks and cloud boundary

Create `validation/phase-6/` with exact small and standard inputs, local benchmark results, cloud benchmark results, a representative sampled output, and a publish-readiness report. The local benchmark runs use the Actor CLI with the saved inputs and capture wall-clock runtime, dataset counts, status distributions, schema-validity rate, duplicate rate, and the aggregate statistics log.

Cloud benchmarks use the currently authenticated Apify CLI account only when an already available Actor version/build can be called without deploying unpublished source. The same three smoke inputs are measured where available: menu enabled, menu disabled, and multiple keywords. If the authenticated account or existing Actor version cannot be reached, the report records the exact failure and marks the cloud component unavailable; no `apify push` is performed automatically.

The London benchmark documentation distinguishes measured values from unavailable cost/compute fields and explains local/cloud differences, including network variance and whether the tested source version is identical.

### Documentation and Store preparation

Update `README.md`, sample input/output, `.actor/actor.json`, schemas only when required by measured contract changes, and `BENCHMARK_LONDON.md`. The README will contain:

- overview and use cases;
- Version 1 scope and global-first/London-tested positioning;
- supported and unsupported menu formats;
- input and output examples;
- dietary provenance and published-nutrition-only rules;
- explainable healthy-classification behavior;
- limitations, responsible-use wording, measured benchmarks, and roadmap;
- prepared Store title and short description without generic Google Maps scraper positioning.

No fabricated metrics will be added. Sample output will be derived from a validated local record and will demonstrate success, partial failure, dietary provenance, published nutrition, and no-nutrition behavior where the existing fixtures support those cases.

## Verification strategy

Use test-first changes for each reliability behavior:

1. Add deterministic unit tests for transient retry, deterministic no-retry, timeout, redirect bounds, response-body limits, and metric aggregation.
2. Add integration tests proving one failed detail, website, or menu page leaves sibling records valid and that all Playwright contexts close.
3. Run only commands discovered in `package.json` and repository documentation: build, lint, format check, unit/integration tests, schema validation, and `apify run` smoke tests.
4. Run local small and standard benchmarks, then authenticated cloud smokes when an existing remote version is available.
5. Validate every JSON artifact and manually review the representative output against the Phase 5 safety/provenance rules.
6. Complete the publish-readiness report with one final recommendation and stop after Phase 6.

## Risks and mitigations

- Live Google Maps or restaurant websites may be blocked or unstable. Preserve valid partial records, classify failures, and report coverage honestly.
- Retrying too broadly could increase load and runtime. Retry only known transient conditions with two total attempts and capped delay.
- Adding metrics to `main.js` could enlarge the orchestration function. Keep collector logic in a separate module and use narrow stage updates.
- Cloud access may be unavailable or require deploying new source. Record the limitation and do not auto-publish.
- Existing Phase 5 work is mixed with unrelated uncommitted repository changes. Modify only files in the Actor and the Phase 6 design/plan/validation paths; do not reset or clean the worktree.
