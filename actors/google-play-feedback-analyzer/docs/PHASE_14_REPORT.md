# Phase 14 report — Schema and Store-readiness work

## Result

Phase 14 is complete. The Actor’s schemas now make the available review, cluster, aggregate, and release-impact outputs discoverable without requiring users to read the implementation.

## Delivered

- Added thematic dataset views: `overview`, `reviews`, `clusters`, `reports`, and `releaseImpact`.
- Added Store-facing output links for the dataset, per-app aggregate reports, release-impact reports, and `RUN_STATS`.
- Added a validated `debug` input flag with explicit local-troubleshooting semantics.
- Kept record-type filtering explicit in documentation; `recordType` remains authoritative across projections.
- Revalidated standard, release-impact, and benchmark sample inputs.

## Validation

- 24 tests passing.
- Lint, formatting, input-schema validation, JSON parsing, and diff checks passing.
- Dataset schema views parse as `overview,reviews,clusters,reports,releaseImpact`.
- No pricing or publishing changes.
