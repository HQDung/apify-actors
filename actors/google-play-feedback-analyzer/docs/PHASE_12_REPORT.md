# Phase 12 report — Release Impact mode

## Result

Phase 12 is complete. The Actor now supports an explicit `releaseImpact` mode that reuses shared analysis and comparison logic while keeping before/after windows non-overlapping and treating the result as observational.

## Delivered

- Added release metadata (`version`, canonical `releasedAt`) and bounded before/after day settings.
- Added language/country arrays; release mode expands one bounded public Store request per app/language/country combination.
- Added release-mode statistics for review volume, average ratings, rating change, issue changes, feature requests, compatibility topics, and language/country/version signals.
- Added `NO_REVIEWS`, `LIMITED_DATA`, and future-release warnings instead of silently presenting insufficient data as a regression.
- Stored enriched reports under `APP_RELEASE_IMPACT_<app-id>` and retained the normal per-app aggregate report.
- Kept reviews at the release timestamp in the after window and reviews before it in the before window.
- Preserved raw, normalized, review-analysis, source-diagnostic, and aggregate records.

## Validation

- Unit/integration tests: 24 passing.
- `npm run lint`: passing.
- `npm run format:check`: passing.
- `npm run validate:schema`: passing.
- `git diff --check`: passing.
- Release-impact smoke: 1 app, 1 language, 1 country, 3 reviews, 1 diagnostic, 1 aggregate report, 1 impact report, 0 errors, 6 dataset records, and both reports stored in key-value storage.

The live public sample had no reviews in the before window and one in the after window, so the report correctly emitted structured insufficiency warnings. This validates the warning path, not release-impact accuracy on a representative sample.
