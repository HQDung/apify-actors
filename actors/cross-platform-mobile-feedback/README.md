# Cross-Platform Mobile App Feedback Intelligence

Compare explicitly mapped Google Play and Apple App Store reviews to identify shared issues, Android-only and iOS-only findings, feature requests, rating differences, localization signals, and release-impact patterns.

## What it does

This Actor is for mobile product managers, QA and engineering teams, support teams, app publishers, ASO agencies, localization teams, and product researchers. It combines source collection with normalized analysis and cautious cross-platform comparison; it is not an automatic app matcher or a generic review scraper.

Supported public sources:

- Google Play reviews using a package ID or public URL.
- Apple App Store customer reviews using a numeric app ID or public URL.

The first release is tested with selected English and Vietnamese Google Play and Apple App Store datasets. Coverage depends on public store availability, country, language, pagination, and rate limits.

## Product mapping

Map each Android and iOS listing to one stable product identity. The Actor never assumes that similarly named apps are the same product.

```json
{
  "productId": "example-product",
  "name": "Example App",
  "googlePlayAppId": "com.example.app",
  "appleAppId": "123456789"
}
```

You can use `googlePlayUrl` and `appleAppStoreUrl` instead of IDs. Explicit IDs take precedence over URLs. Duplicate platform IDs assigned to different products are rejected. `comparePlatforms` and `releaseComparison` require both platform mappings; `rawReviews` and `feedbackAnalysis` allow one platform.

## Run modes

- `rawReviews` — collect normalized source reviews for downstream use.
- `feedbackAnalysis` — add per-review analysis and platform-level issue clusters.
- `comparePlatforms` — produce same-product shared, platform-specific, dominant, and insufficient-evidence comparisons plus a product report.
- `releaseComparison` — compare independently dated Android and iOS before/after windows.

The checked-in [sample input](sample-input.json) is a bounded live cloud smoke test using Spotify's public Google Play package ID and Apple App Store app ID. From this Actor directory, run it with:

```bash
apify call obliging_persimmon_cki/cross-platform-mobile-feedback --input-file sample-input.json --output-dataset
```

It makes one request per store, caps each platform at five reviews, enables the deterministic fallback when no provider key is configured, and keeps report generation enabled. [sample-benchmark.json](sample-benchmark.json) shows a multi-product configuration.

The Console's default input uses the same public mapping and bounded limits, so an Apify automation test can run without manually entering product IDs.

## Input controls

Use `countries`, `languages`, `ratings`, and `dateRange` to bound collection. `maxReviewsPerPlatform`, `maxPagesPerPlatform`, `requestTimeoutSecs`, and `maxRequestsPerRun` bound source work. The request cap is checked after expanding products, platforms, countries, and languages, before network collection begins.

Analysis cost is bounded by `analysis.maxReviewsToAnalyze`, `analysis.maxAttempts`, and `analysis.cacheMaxEntries`. `OPENAI_API_KEY` enables the optional native-fetch OpenAI-compatible provider; `OPENAI_MODEL` selects the model when supported. Without a key, the dependency-free deterministic fallback keeps the run operational and marks the resulting analysis accordingly.

## Output

The dataset contains normalized `review`, `reviewAnalysis`, `feedbackCluster`, `crossPlatformComparison`, `crossPlatformFeedbackReport`, `releaseComparisonReport`, `sourceDiagnostic`, and `runError` records. The output schema links the dataset, per-product reports, release reports, normalized input, source errors, and run statistics.

Key-value records include:

- `NORMALIZED_INPUT` — validated settings and explicit mappings.
- `CROSS_PLATFORM_REPORT_<productId>` and `CROSS_PLATFORM_REPORTS` — product reports.
- `CROSS_PLATFORM_RELEASE_REPORT_<productId>` and `CROSS_PLATFORM_RELEASE_REPORTS` — release reports.
- `SOURCE_ERRORS` — platform-scoped fetch failures retained for partial runs.
- `RUN_STATS` — collection, analysis, cluster, comparison, report, request, error, usage, and runtime counters.

## Reports and comparisons

Reports include platform review counts, average ratings, actionable-review counts, shared issues, Android-only issues, iOS-only issues, shared feature requests, rating/volume differences, and country/language/version insights. Platform-specific language is deliberately limited to “observed only in the collected sample.” Missing or insufficient source evidence is surfaced as warnings rather than treated as evidence of absence.

Release comparison uses separate Android and iOS release dates, non-overlapping before/after windows, staggered rollout timing, topic changes, new issues, possible regressions, and minimum-sample warnings. It is observational and does not prove that a release caused a change.

## Quality benchmark

Run `npm run benchmark:quality` for the deterministic 100-review fixture: 50 reviews per platform, 25 known shared review pairs, 10 feature-request pairs, 50 labeled platform-specific examples, mixed English/Vietnamese metadata, and staggered releases. The current fixture result is 100% analysis-schema validity, 100% cluster coherence, 100% shared precision and recall, 0% platform-specific false positives, correct dimension and release-window calculations, and no cross-product matches. The fixture provider reports an estimated $0.02 cost for one product comparison; live provider cost depends on model and review volume.

## Limitations and responsible use

- Reviews are user reports and opinions, not confirmed defects.
- Platform-specific means observed only in the collected sample, never “absent” from the other platform.
- Review availability differs by store, country, language, pagination, and public-feed behavior.
- Ratings are not necessarily comparable when source coverage differs.
- Requested store locale is not guaranteed reviewer-origin language.
- Release comparison shows correlation in bounded windows, not causation.
- AI may misclassify sarcasm, ambiguity, or mixed-language feedback.
- Validate important product, QA, support, and release decisions against source reviews and internal telemetry.

Use only public review data, respect source terms and rate limits, and do not include private or authenticated review sources.

## FAQ

**Does the Actor find matching apps automatically?** No. Supply explicit product mappings.

**Can one store fail without losing the other store’s data?** Yes. Successful reviews are retained, and scoped diagnostics, warnings, and `SOURCE_ERRORS` identify failures.

**Is an OpenAI key required?** No. It is only used for the optional provider path; the fallback is local and deterministic.

**Can I compare releases with different rollout dates?** Yes. Supply separate Android and iOS release metadata; the report includes rollout lag and separate windows.

## Roadmap

Future work may improve source pagination coverage, expand validated language fixtures, add richer confidence calibration, and support additional public feedback sources. Automatic app matching, private sources, ticket creation, competitor discovery, rankings, revenue estimation, and generated developer replies are outside this Actor’s scope.

No publication or pricing changes are performed automatically.
