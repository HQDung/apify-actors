# Cross-Platform Prerequisite Audit

**Date:** 2026-08-01

**Scope:** Phase 0 of the Cross-Platform Mobile App Feedback Intelligence handoff.

## Source inventory

| Component | Repository path | Status | Evidence |
| --- | --- | --- | --- |
| Shared feedback-analysis core | `packages/feedback-analysis-core` | Ready for source integration, with scope limits | 10/10 core tests pass; contracts, taxonomy, deterministic fallback, clustering, aggregation, and window comparison are present |
| Google Play source Actor | `actors/google-play-feedback-analyzer` | Available and locally regression-tested | 27/27 Actor tests pass; normalized adapter, collection, analysis attachment, clustering, aggregation, and release-impact tests are present |
| Apple App Store source Actor | No repository directory found under `actors/` | **Blocking prerequisite missing** | No Apple source adapter, schema, fixture set, or regression suite exists |
| Cross-platform comparison core | No repository package found | Not started | Correctly deferred until both source contracts are stable |

## Verification evidence

Commands run from the repository root:

- `node --test packages/feedback-analysis-core/test/*.test.js` — 10 passed, 0 failed.
- `node --test actors/google-play-feedback-analyzer/test/*.test.mjs actors/google-play-feedback-analyzer/tests/technical-spike-fixtures.test.mjs` — 27 passed, 0 failed.
- `node --test tests/contracts/*.test.js tests/regression/*.test.js` — 8 passed, 1 intentional network smoke skipped, 0 failed.
- `node --test test/core-packaging.test.js` — 1 passed, 0 failed.
- `apify --help` — CLI installed, version `1.7.1`.
- `apify info` — unable to reach `api.apify.com` from the current sandbox (`ENOTFOUND`); no cloud readiness claim is made from this command.

The repository-wide generic `node scripts/validate-actor-files.js actors/google-play-feedback-analyzer` is not an applicable validator for this Actor: it expects the lead-scraper template’s `src/niche-config.js` and generated storage input. The Actor-specific schema command must be used instead in later phases.

## Representative Google output

The existing local output at `actors/google-play-feedback-analyzer/storage/` demonstrates the current source path:

- Three `recordType: "review"` records retain raw text, rating, source language/country, developer-reply data, and a validated `normalizedFeedback` object.
- One `recordType: "sourceDiagnostic"` records the request URL, HTTP status, response bytes, collection timestamp, and parsed count.
- One `recordType: "productFeedbackReport"` reports review, rating, language, country, and version aggregates.
- `RUN_STATS.json` records 3 reviews, 1 diagnostic, 3 analyses, 1 aggregate report, 0 errors, and a 675 ms local runtime for the captured sample.

This is evidence of the current Google path only; it is not evidence of cross-platform comparison readiness.

## Audit conclusion

The shared core and Google source are sufficiently stable to serve as inputs to an Apple adapter, subject to the contract gaps documented in `docs/NORMALIZED_CONTRACT_GAPS.md`. The project must implement and validate the Apple App Store source before Phase 1 comparison contracts can be treated as executable across both platforms.
