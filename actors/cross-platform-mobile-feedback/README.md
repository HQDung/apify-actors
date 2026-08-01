# Cross-Platform Mobile App Feedback Intelligence

This Actor accepts explicit Google Play and Apple App Store product mappings and incrementally builds cross-platform feedback intelligence. The current phase collects raw normalized reviews from both public store feeds and emits source diagnostics; analysis, clustering, comparison, and report records are added in later phases.

## Product mapping

Always identify the same product explicitly:

```json
{
  "productId": "example-product",
  "name": "Example App",
  "googlePlayAppId": "com.example.app",
  "appleAppId": "123456789"
}
```

IDs take precedence over parsed URL values. The Actor rejects duplicate Google Play or Apple IDs assigned to different product IDs and never auto-matches similarly named apps.

## Modes

- `rawReviews`: collect normalized source reviews.
- `feedbackAnalysis`: add per-review analysis and platform-level clusters.
- `comparePlatforms`: compare explicitly paired Google Play and Apple App Store feedback.
- `releaseComparison`: compare separate Android and iOS release windows.

## Current phase output

The collection phase writes normalized `review`, `sourceDiagnostic`, and platform-scoped `runError` dataset records, plus `NORMALIZED_INPUT` and `RUN_STATS`. A mapping error is stored as a scoped `RUN_ERROR` and the Actor fails fast; a source request failure preserves successful records from other platforms.

Source collection is bounded by `maxReviewsPerPlatform`, `requestTimeoutSecs`, and `maxPagesPerPlatform`. Google Play uses its public review HTML surface; Apple uses the public RSS/JSON customer-review feed. Store coverage, pagination, and rate limits are recorded in diagnostics.

## Limitations

Product identity is user-provided. Platform-specific findings will mean observed only in the collected sample. Country, language, version, and release differences can reflect store coverage and review availability rather than true prevalence. Release comparisons are observational, not proof of causation.

No publication or pricing changes are performed automatically.
