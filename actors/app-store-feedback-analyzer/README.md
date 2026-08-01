# Apple App Store Reviews & App Feedback Analyzer

Collect bounded public Apple App Store reviews from Apple’s RSS/JSON customer-review feed and turn them into normalized review records, shared-core analysis, platform-scoped clusters, aggregate reports, and cautious release-impact observations.

This Actor is the Apple source prerequisite for the Cross-Platform Mobile App Feedback Intelligence product. It is not an automatic app matcher and it does not scrape authenticated App Store Connect data.

## What it supports

- Numeric Apple App Store app IDs and public App Store URLs.
- Storefront country selection and a requested feed locale hint.
- Bounded pagination with review-ID deduplication.
- Raw review records with title, text, rating, date, app version, helpful votes, and source diagnostics.
- Shared feedback-analysis contracts, clustering, per-app reports, and observational release windows.
- Partial source failure: successful apps and already-collected reviews remain available when another request fails.
- English and Vietnamese contract fixtures; the feed locale is preserved as a request dimension.

## Input example

```json
{
  "appIds": ["123456789"],
  "country": "US",
  "language": "en",
  "maxReviewsPerApp": 50,
  "maxPagesPerApp": 10,
  "analysis": { "enabled": true },
  "aggregation": { "enabled": true, "minimumClusterSize": 2 }
}
```

Use `appStoreUrls` when the numeric ID is not already available. Explicit IDs take precedence over duplicate URL IDs.

## Release impact

Set `mode` to `releaseImpact` and provide `release.releasedAt`, `daysBefore`, and `daysAfter`. The result compares review windows around the release timestamp and uses observational language such as “issue mentions increased after release.” It does not prove causation.

## Output

Dataset records include `review`, `sourceDiagnostic`, `feedbackCluster`, `productFeedbackReport`, and `feedbackImpactReport` records. Normalized records retain the source platform as `apple-app-store`, the Apple app ID, original text, source locale, storefront country, and nullable fields where Apple does not expose metadata.

`RUN_STATS` records collection, analysis, aggregation, runtime, memory, and error counts. Per-app reports are stored under `APP_STORE_REPORT_<app-id>`.

## Limitations and responsible use

- The public feed is bounded and storefront-specific; it is not a complete worldwide review archive.
- Apple’s public feed does not guarantee the reviewer’s original language. `language` is retained as the requested feed locale and must not be treated as ground-truth reviewer language when it is unavailable.
- Developer replies are not exposed by this public feed and remain `null` unless a future permitted source provides them.
- Missing app-version, country, language, or date fields remain `null`/`unknown`; the Actor does not invent metadata.
- Detected issues are user reports, not confirmed defects. Important product decisions require manual validation.
- AI or fallback analysis may misclassify sarcasm, ambiguity, or mixed-language feedback.

## Local development

```bash
npm install
node --test test/*.test.mjs
apify validate-schema
```

The Actor uses Apple’s public RSS/JSON customer-review feed and does not require an API key for public review collection. Respect Apple’s current feed terms, rate limits, and applicable laws.
