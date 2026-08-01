# Phase 16 plan — Final publish-readiness testing

1. Run the collection matrix for one app, multiple apps, invalid mixed input, English/Vietnamese locales, multiple countries, limits, and no-match windows.
2. Run analysis tests for raw-only mode, fallback/provider failures, invalid provider JSON, short/empty/mixed-language text, and multi-issue reviews.
3. Run clustering and Release Impact tests for isolation, thresholds, versions, empty windows, future dates, and insufficient data.
4. Validate dataset/output schemas, restart/error behavior, secrets/log redaction, and local Actor runs.
5. Produce a final readiness report listing passing gates and any remaining publish blockers.
6. Do not publish; Phase 17 remains gated on explicit authorization.
