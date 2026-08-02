# Phase 14 report — cloud smoke and publication

Date: 2026-08-02

## Cloud deployment

- Actor: `obliging_persimmon_cki/cross-platform-mobile-feedback`
- Actor ID: `tIfWWepak0ilc7HZh`
- Build: `0.1.1` (`6ta1Yy4QeYF4nYZjv`)
- Build status: `SUCCEEDED`
- Console: https://console.apify.com/actors/tIfWWepak0ilc7HZh

## Smoke test 1 — raw collection

Run: `cDybgJpgo15hdO5g9`

Input used one explicit Spotify mapping (`com.spotify.music` and `324684580`), `US/en`, one source page, five-review platform caps, and `rawReviews` mode.

- Run status: `SUCCEEDED`
- Runtime: 1.079 seconds
- Usage: approximately `$0.0012`
- Google Play request: HTTP 200; 3 normalized reviews
- Apple App Store request: HTTP 200; 0 reviews from the valid empty RSS response
- Source errors: 0
- Analysis: intentionally skipped; 0 provider attempts and 0 estimated analysis cost
- Dataset contract: 3 `review` records and 2 `sourceDiagnostic` records
- Expected behavior: no cross-platform report in `rawReviews` mode (`reportsStored=0`)

This validates live source access, normalization, bounded requests, diagnostics, and the raw-output contract. A full reporting-mode smoke is required before publication.

## Smoke test 2 — analysis and comparison path

Run: `XGwk4bvl30OWqNS52`

The same mapping was run in `comparePlatforms` mode with deterministic analysis enabled for the 3 collected reviews and comparison enabled. The run succeeded with 3 valid `reviewAnalysis` records, 0 analysis failures, 0 source errors, and 0 provider attempts.

`reportsStored=0` was expected for this test because report persistence is gated by `aggregation.enabled`, which was intentionally false. The final cloud check must enable aggregation to exercise the report contract.

## Smoke test 3 — full report contract

Run: `DurSEmlS4oMk6a99G`

The same mapping was run with `comparePlatforms`, deterministic analysis, comparison, and aggregation enabled.

- Run status: `SUCCEEDED`
- Runtime: 1.205 seconds
- Usage: approximately `$0.0012`
- Google Play reviews: 3
- Apple App Store reviews: 0; HTTP 200 empty RSS response retained as evidence
- Review analyses: 3 successful deterministic-fallback records
- Analysis failures: 0; provider attempts: 0; estimated analysis cost: `$0`
- Cross-platform comparisons: 0, correctly reflecting no cross-platform review overlap
- Reports stored: 1 validated `crossPlatformFeedbackReport`
- Source errors: 0
- Report warning: `INSUFFICIENT_CROSS_PLATFORM_DATA` for iOS, with limited country/language evidence
- Dataset contract: review, source diagnostic, review analysis, and report records emitted

The limited iOS evidence is a truthful result of the live public RSS response, not a runtime failure. The report explicitly carries the warning and does not invent cross-platform findings.

## Publication gate

Cloud validation is complete and the Actor is ready for the explicitly authorized publication action. Pricing has not been changed.

## Publication

- Visibility update: `PUT /v2/actors/tIfWWepak0ilc7HZh` with `isPublic=true` and the existing `AI`/`BUSINESS` categories
- Verified remote state: `isPublic=true`
- Public Store URL: https://apify.com/obliging_persimmon_cki/cross-platform-mobile-feedback
- Latest build remains `0.1.1` (`6ta1Yy4QeYF4nYZjv`)
- Pricing: unchanged

Phase 14 is complete. The Actor is cloud-tested, publicly published, and ready for users.
