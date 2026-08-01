# Phase 8 report — country and language intelligence

Date: 2026-08-01

## Result

Phase 8 is complete. Per-product reports now contain country, requested-language, and version dimension insights with platform-separated statistics and sample-size safeguards.

## Delivered

- Per-dimension Android/iOS review counts, average ratings, actionable counts, and negative topics.
- Configurable `comparison.minimumDimensionReviews` threshold.
- `sufficient`/`limited` evidence status and dimension-level low-sample warnings.
- Explicit language attribution: requested store locale is not treated as reviewer-origin language.
- Country and language remain separate arrays and are not used as interchangeable matching signals.

## Verification

- Cross-platform Actor tests: 26 passed.
- Report tests: 2 passed, including sufficient and limited dimension evidence.
- Input normalization tests include the dimension threshold.
- Cross-platform Actor lint: passed.
- Cross-platform Actor formatting: passed.
- Apify input schema validation: passed.
- Local reporting run: completed with one validated report and empty dimension arrays because the sandbox returned no reviews; missing-source warnings were retained.

## Gate

Phase 8 acceptance criteria are met. Phase 9 may begin: add version/release-window comparisons with non-overlapping platform-specific windows and observational wording.
