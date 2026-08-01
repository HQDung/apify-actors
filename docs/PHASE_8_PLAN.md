# Phase 8 Plan — Google Play Raw Collector

**Goal:** Build a validated JavaScript Actor that collects bounded public Google Play review records without analysis.

**Tasks:**

- Create `actors/google-play-feedback-analyzer` with Actor metadata and `generatedBy`.
- Implement input normalization for package IDs, locale/country, maximum records, sort, and browser-fallback mode.
- Parse public Store HTML into raw review records while preserving nullable source fields and collection diagnostics.
- Add bounded retries, rate limiting, deduplication, and machine-readable source errors.
- Update README, input schema, output schema, dataset schema, sample input, and benchmark notes together.
- Add fixture tests and a local `apify run` smoke test before Phase 9.

**Gate:** Raw records and diagnostics are emitted with validated schemas; no AI provider is called by the default Actor path.
