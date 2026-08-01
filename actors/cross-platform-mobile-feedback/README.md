# Cross-Platform Mobile App Feedback Intelligence

This Actor accepts explicit Google Play and Apple App Store product mappings and will combine normalized review data into cross-platform feedback intelligence. The current phase validates product identity and run settings; source collection and comparison records are added in later implementation phases.

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

The validated skeleton writes `NORMALIZED_INPUT` and zero-collection `RUN_STATS`. Later phases will add review, cluster, comparison, report, and source-error dataset records. A mapping error is stored as a scoped `RUN_ERROR` and the Actor fails fast.

## Limitations

Product identity is user-provided. Platform-specific findings will mean observed only in the collected sample. Country, language, version, and release differences can reflect store coverage and review availability rather than true prevalence. Release comparisons are observational, not proof of causation.

No publication or pricing changes are performed automatically.
