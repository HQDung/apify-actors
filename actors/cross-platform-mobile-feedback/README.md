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

The comparison phase writes normalized `review`, `reviewAnalysis`, `feedbackCluster`, `crossPlatformComparison`, `sourceDiagnostic`, and platform-scoped `runError` dataset records, plus `NORMALIZED_INPUT`, `CLUSTER_INDEX`, `CROSS_PLATFORM_COMPARISONS`, and `RUN_STATS`. Clusters are created separately for Android and iOS; comparison matches are restricted to the same explicit product and use cautious collected-sample wording. Reports include country/language/version dimensions with per-platform counts and explicit small-sample status.

Source collection is bounded by `maxReviewsPerPlatform`, `requestTimeoutSecs`, and `maxPagesPerPlatform`. Google Play uses its public review HTML surface; Apple uses the public RSS/JSON customer-review feed. Store coverage, pagination, and rate limits are recorded in diagnostics.

When `OPENAI_API_KEY` is present, per-review analysis uses the native-fetch OpenAI-compatible provider and `OPENAI_MODEL` if supplied. Without a key, the shared deterministic fallback keeps the Actor dependency-free; `analysis.maxReviewsToAnalyze`, `analysis.maxAttempts`, and `analysis.cacheMaxEntries` bound analysis cost. Reports are observational summaries and disclose missing-platform or partial-source evidence. Language dimensions represent requested store locale, not guaranteed reviewer-origin language.

## Limitations

Product identity is user-provided. Platform-specific findings will mean observed only in the collected sample. Country, language, version, and release differences can reflect store coverage and review availability rather than true prevalence. Release comparisons are observational, not proof of causation.

No publication or pricing changes are performed automatically.
