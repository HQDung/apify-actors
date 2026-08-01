# Phase 3 plan: cross-platform source collection

## Objective

Collect bounded Google Play and Apple App Store review samples through one runtime-neutral adapter package, normalize them into the cross-platform Actor's source contract, and preserve platform-scoped diagnostics and partial failures.

## Implementation

1. Extract public-feed parsing and collection clients into `packages/mobile-feedback-source-adapters`.
2. Add injected-response tests for both parsers, diagnostics, timeouts/errors, and Apple pagination failure handling.
3. Add bounded request controls to cross-platform input normalization.
4. Wire mapped products, country/language requests, rating/date filters, deduplication, normalized review records, diagnostics, and run errors into the Actor.
5. Update Actor packaging, schemas, samples, README, benchmark notes, and changelog together.
6. Run package tests, Actor tests, lint, formatting, schema validation, and a local Actor run before advancing.

## Acceptance criteria

- Google Play and Apple App Store adapters pass injected-response tests.
- Mapped products emit normalized `review` records with stable product/platform identity.
- Source failures are scoped to the product/platform request and do not discard successful records.
- Request count, review count, and error count are written to `RUN_STATS`.
- The Actor validates and packages both vendored runtime packages without changing pricing or publishing.
