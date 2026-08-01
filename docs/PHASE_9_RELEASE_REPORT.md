# Phase 9 report — version and release-window comparisons

Date: 2026-08-01

## Result

Phase 9 is complete. `releaseComparison` now produces a per-product observational report with independently bounded Android/iOS windows and rollout timing.

## Delivered

- Non-overlapping before/after windows per platform release date.
- Shared-core topic changes, new issues, improved topics, and possible regressions per platform.
- Shared and platform-specific regression topic summaries.
- Staggered release lag in days.
- Minimum release-window sample and missing app-version warnings.
- Stable `CROSS_PLATFORM_RELEASE_REPORT_<productId>` and aggregate release-report key-value outputs.
- Release report dataset/output schema coverage and synchronized samples/docs.

## Verification

- Cross-platform Actor tests: 28 passed.
- Release tests: 2 passed, including non-overlap and staggered release behavior.
- Cross-platform Actor lint: passed.
- Cross-platform Actor formatting: passed.
- Apify input schema validation: passed.
- Feedback-analysis core tests: 10 passed.
- Comparison-core contract tests: 7 passed.
- Source-adapter tests: 4 passed.

Release lifecycle is fixture-verified; the standard local sample remains `comparePlatforms` and the sandbox has no live source reviews for a release run. All release reports disclose that changes are observational, not proof of causation.

## Gate

Phase 9 acceptance criteria are met. Phase 10 may begin: finalize dataset views, output links, structured errors, and runtime safeguards across all record types.
