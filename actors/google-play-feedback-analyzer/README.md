# Google Play Reviews & App Feedback Analyzer

Collect bounded public Google Play review records for one or more Android apps. The current release uses the public Store HTML page, preserves locale and market parameters, emits source diagnostics, and attaches optional shared-core analysis without coupling analysis to collection.

## What it collects

- Review ID, star rating, localized date text, review text, and helpful count.
- Optional developer reply text and date when present in the public card.
- Language and country used for the request.
- A machine-readable diagnostic record for every app, including HTTP status, response size, and parsed-card count.
- A `normalizedFeedback` object on each review, validated by the shared source-neutral feedback contract.
- Shared analysis, actionable-feedback clusters, per-app aggregate reports, and optional observational release comparisons.
- One `APP_REPORT_<app-id>` report in key-value storage per processed app when aggregation is enabled.

The public page currently exposes a bounded server-rendered sample, not complete review history. Browser expansion remains deferred; shared deterministic analysis and aggregation are enabled by default.

## Who it is for

Product managers, mobile QA teams, support teams, and app developers who need a bounded Google Play review sample converted into traceable product-feedback signals.

## Key capabilities

- Collect public Google Play reviews for multiple Android package IDs with language and country provenance.
- Preserve source facts while adding validated normalized feedback and deterministic shared-core analysis.
- Surface recurring actionable feedback as stable issue/feature clusters linked back to review IDs.
- Produce one aggregate report per app and an optional before/after release-impact report.

## Raw reviews versus analysis

Review text, ratings, dates, helpful counts, replies, and source diagnostics are collected facts. `normalizedFeedback`, `analysis`, clusters, rankings, severity, and release-impact signals are analytical interpretations. Analytical issue labels are user-reported signals, not confirmed product defects.

## Input

| Field                 | Required      | Default        | Description                                                                           |
| --------------------- | ------------- | -------------- | ------------------------------------------------------------------------------------- |
| `mode`                | no            | `reviews`      | `reviews` for normal collection or `releaseImpact` for a bounded before/after report. |
| `appIds`              | yes           | `["com.todoist"]` | Android package IDs, up to 20.                                                     |
| `language`            | no            | `en`           | Two- or three-letter Google Play language code.                                       |
| `country`             | no            | `US`           | Two-letter Google Play market code.                                                   |
| `languages`           | no            | `[language]`   | Language list used by `releaseImpact`; one public Store request per combination.      |
| `countries`           | no            | `[country]`    | Country list used by `releaseImpact`; one public Store request per combination.       |
| `maxReviewsPerApp`    | no            | `50`           | Hard cap from the parsed server-rendered sample, 1–500.                               |
| `sort`                | no            | `mostRelevant` | `mostRelevant` or `newest`; recorded for diagnostics in the current HTML path.        |
| `useBrowserFallback`  | no            | `false`        | Reserved for the later browser-expansion phase.                                       |
| `requestTimeoutSecs`  | no            | `30`           | Per-request timeout, 5–120 seconds.                                                   |
| `debug`               | no            | `false`        | Emit normalized-input details through debug logging for local troubleshooting.        |
| `analysis`            | no            | enabled        | Shared analysis settings: `enabled`, `outputLanguage`, and `maxAttempts`.             |
| `aggregation`         | no            | enabled        | Cluster and report settings, including optional observational release comparison.     |
| `release`             | releaseImpact | —              | Release version and ISO `releasedAt` timestamp.                                       |
| `daysBefore`          | releaseImpact | `14`           | Calendar days before the release boundary.                                            |
| `daysAfter`           | releaseImpact | `14`           | Calendar days after the release boundary.                                             |
| `maxReviewsPerPeriod` | releaseImpact | `100`          | Request cap for each language/country slice.                                          |

Example:

```json
{
    "mode": "reviews",
    "appIds": ["com.todoist", "com.zing.zalo"],
    "language": "vi",
    "country": "VN",
    "maxReviewsPerApp": 25,
    "sort": "mostRelevant",
    "useBrowserFallback": false
}
```

Release-impact example:

```json
{
    "mode": "releaseImpact",
    "appIds": ["com.example.app"],
    "languages": ["en", "vi"],
    "countries": ["US", "VN"],
    "release": { "version": "4.2.0", "releasedAt": "2026-07-20T00:00:00.000Z" },
    "daysBefore": 14,
    "daysAfter": 14,
    "maxReviewsPerPeriod": 100
}
```

## Output fields

| Field                            | Description                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `recordType`                     | `review`, `sourceDiagnostic`, `feedbackCluster`, `productFeedbackReport`, or `feedbackImpactReport`. |
| `appId`                          | Android package ID.                                                                                  |
| `reviewId`                       | Public Google Play review ID, for review records.                                                    |
| `rating`                         | Integer star rating from 1 to 5.                                                                     |
| `reviewDateText`                 | Locale-preserved date text from the public page.                                                     |
| `text`                           | Public review text, for review records.                                                              |
| `helpfulCount`                   | Helpful count when exposed, otherwise `null`.                                                        |
| `developerReply`                 | Optional reply object with presence, date text, and text.                                            |
| `source.language`                | Language request parameter.                                                                          |
| `source.country`                 | Country request parameter.                                                                           |
| `diagnostics.httpStatus`         | HTTP status for the Store response.                                                                  |
| `diagnostics.responseBytes`      | Response size in bytes.                                                                              |
| `diagnostics.collectedAt`        | Collection timestamp for the source response.                                                        |
| `diagnostics.parsedReviewCount`  | Number of unique review cards parsed before the cap.                                                 |
| `diagnostics.collectionMode`     | Current value is `html`.                                                                             |
| `error.code`                     | Machine-readable source error code when collection fails.                                            |
| `normalizedFeedback`             | Source-neutral feedback object validated by shared core.                                             |
| `analysis`                       | Shared-core analysis result, when analysis is enabled.                                               |
| `product.productId`              | App ID on aggregate and impact records.                                                              |
| `product.productType`            | Neutral product type; `app` for Google Play aggregate records.                                       |
| `clusterId`                      | Stable cluster ID on feedback-cluster records.                                                       |
| `canonicalIssue`                 | Canonical issue or request title for a cluster.                                                      |
| `feedbackType`                   | Cluster feedback type, such as `bugReport`.                                                          |
| `topics`                         | Topics attached to a cluster or release-impact comparison.                                           |
| `mentionCount`                   | Number of reviews in a cluster.                                                                      |
| `uniqueReviewCount`              | Number of distinct source review IDs in a cluster.                                                   |
| `languages`                      | Languages represented in a cluster.                                                                  |
| `countries`                      | Countries represented in a cluster.                                                                  |
| `affectedVersions`               | App versions represented in a cluster.                                                               |
| `firstSeenAt`                    | Earliest source date represented in a cluster.                                                       |
| `latestSeenAt`                   | Latest source date represented in a cluster.                                                         |
| `severity`                       | Analytical severity estimate.                                                                        |
| `clusterConfidence`              | Bounded cluster confidence estimate.                                                                 |
| `statistics`                     | Counts, rating, language, country, and version summaries.                                            |
| `statistics.reviewsCollected`    | Collection count in an app report.                                                                   |
| `statistics.reviewsAnalyzed`     | Successful-analysis count in an app report.                                                          |
| `statistics.actionableReviews`   | Actionable-review count in an app report.                                                            |
| `statistics.averageRating`       | Average source rating in an app report.                                                              |
| `statistics.beforeReviews`       | Before-window review count.                                                                          |
| `statistics.afterReviews`        | After-window review count.                                                                           |
| `statistics.beforeAverageRating` | Before-window average when ratings are available.                                                    |
| `statistics.afterAverageRating`  | After-window average when ratings are available.                                                     |
| `statistics.ratingChange`        | After-window average minus before-window average.                                                    |
| `topIssues`                      | Ranked app-level issue summaries.                                                                    |
| `topFeatureRequests`             | Ranked app-level feature-request summaries.                                                          |
| `topPositiveTopics`              | Ranked positive topic summaries.                                                                     |
| `topNegativeTopics`              | Ranked negative topic summaries.                                                                     |
| `languageInsights`               | App-level language summary.                                                                          |
| `countryInsights`                | App-level country summary.                                                                           |
| `versionInsights`                | App-level version summary.                                                                           |
| `topicChanges`                   | Observed before/after topic changes.                                                                 |
| `possibleRegressions`            | Topic increases worded as possible regressions, never causal proof.                                  |
| `release` / `windows`            | Release metadata and exact non-overlapping comparison windows.                                       |
| `release.version`                | Release version supplied to Release Impact.                                                          |
| `release.releasedAt`             | Release timestamp supplied to Release Impact.                                                        |
| `windows.before.from`            | Before-window ISO start.                                                                             |
| `windows.before.to`              | Before-window ISO end.                                                                               |
| `windows.after.from`             | After-window ISO start.                                                                              |
| `windows.after.to`               | After-window ISO end.                                                                                |
| `issueChanges`                   | Issue signals across the release boundary.                                                           |
| `featureRequestChanges`          | Feature-request signals across the release boundary.                                                 |
| `newIssues`                      | Issue signals first observed in the after window.                                                    |
| `increasingIssues`               | Issue signals with increased after-window mentions.                                                  |
| `decreasingIssues`               | Issue signals with decreased after-window mentions.                                                  |
| `newFeatureRequests`             | Feature requests first observed in the after window.                                                 |
| `compatibilityChanges`           | Compatibility-topic changes.                                                                         |
| `countryChanges`                 | Country-dimension review volume changes.                                                             |
| `languageChanges`                | Language-dimension review volume changes.                                                            |
| `versionChanges`                 | Version-dimension review volume changes.                                                             |
| `warnings`                       | Structured `NO_REVIEWS`, `LIMITED_DATA`, or future-release warnings.                                 |
| `generatedAt`                    | Timestamp when a report or comparison was generated.                                                 |
| `disclaimer`                     | Caution that release comparisons are observational, not causal proof.                                |

Aggregate reports are also stored under `APP_REPORT_<app-id>` in the default key-value store. Reports tolerate partial analysis failures by counting only successful analyses in ranked intelligence while retaining collection counts.

In `releaseImpact` mode, the enriched report is also stored under `APP_RELEASE_IMPACT_<app-id>`. Reviews exactly at `release.releasedAt` belong to the after window; reviews before it belong to the before window. Empty or small windows remain structured rather than being presented as proof of a regression.

The dataset schema provides thematic views for Reviews, Issue clusters, App reports, and Release impact reports. The views are projections over the same dataset; `recordType` remains the authoritative discriminator.

## Issue-cluster output

`feedbackCluster` records contain a stable cluster ID, canonical issue or request title, feedback type, topics, mention counts, languages, countries, versions, severity estimate, confidence, and example/source review IDs. Clusters are partitioned by app and are emitted separately from raw reviews.

## Aggregated app reports

`productFeedbackReport` records summarize collection volume, analyzed volume, ratings, actionable feedback, top issues, feature requests, positive/negative topics, and language/country/version insights. The same per-app report is stored as `APP_REPORT_<app-id>`.

## Release Impact

`releaseImpact` mode compares non-overlapping review windows around a supplied release timestamp. It reports rating and volume changes, new/increasing/decreasing issue and feature-request signals, compatibility topics, and locale/version dimensions. It uses wording such as “possible regression” and “newly observed complaint”; timing alone is never treated as causal proof.

## Language and country support

English and Vietnamese parsing are covered by redacted fixtures. Release Impact can request multiple language/country combinations, while every output keeps the request provenance. Review availability and date/label formatting depend on Google Play’s public response for the selected market.

## Cost controls

Keep `maxReviewsPerApp` or `maxReviewsPerPeriod` bounded, request only required apps and locale combinations, and leave browser expansion disabled unless a later release explicitly supports it. The default deterministic fallback does not call an external model provider; external-provider and cloud billing costs are not included in the local benchmark.

## Local run

```bash
npm install
apify validate-schema
apify run --purge --input-file sample-input.json
```

The local dataset and `RUN_STATS` key-value record are written under `storage/`. They are local verification artifacts and are not published automatically.

## Benchmark evidence

The Phase 13 five-app matrix processed 15 reviews with 15 deterministic analyses, 0 collection errors, 0 analysis failures, 5 aggregate reports, 6.56 MB of public response data, 1.889 seconds runtime, and 200 MiB reported process RSS. See [`BENCHMARK_NOTES.md`](BENCHMARK_NOTES.md), [`docs/BENCHMARK_REPORT.md`](docs/BENCHMARK_REPORT.md), [`docs/QUALITY_REVIEW.md`](docs/QUALITY_REVIEW.md), and [`docs/COST_REPORT.md`](docs/COST_REPORT.md) for scope and limitations. These are operational measurements, not human-labeled accuracy claims.

## Known limitations

- Google Play localizes markup labels and dates; parsing uses structural selectors and star classes rather than English-only labels.
- Direct HTML normally contains a small sample. “See all reviews” browser expansion is a later phase.
- App version and device metadata are nullable until a stable public fixture proves those fields.
- Public HTML is untrusted input; the Actor bounds requests, strips markup through Cheerio, validates ratings, deduplicates review IDs, and does not emit reviewer names or avatar URLs.
- The authenticated Google Play Developer API is a separate app-owner source and is not used for arbitrary public apps.

## Responsible use

- Reviews are user opinions and may be incomplete, sarcastic, duplicated, or ambiguous.
- Detected issues are not confirmed bugs; severity and actionability are estimates.
- Device, operating-system, and app-version fields may be unavailable and remain nullable rather than inferred.
- Release Impact shows correlation around a date, not proven causation.
- Review important product decisions manually and respect Google’s terms, privacy expectations, and applicable law.

## FAQ

**Does this collect complete Google Play history?** No. The current public HTML path returns a bounded server-rendered sample.

**Does it create Jira/Linear tickets or use the Developer API?** No. Those integrations are outside the first release, and the authenticated Developer API is not a public-app source.

**Can I trust a cluster as a confirmed defect?** No. Use clusters as prioritization evidence and trace them to the underlying reviews.

**How do I read reports?** Use the dataset views or read `APP_REPORT_<app-id>` and, for Release Impact, `APP_RELEASE_IMPACT_<app-id>` from the default key-value store.

**What happens when a release window has too little data?** The report remains structured and includes `NO_REVIEWS` or `LIMITED_DATA` warnings.

## Search terms

Google Play reviews, Google Play review scraper, app review analyzer, mobile app feedback, app bug detector, feature request extractor, app sentiment analysis, release impact, Android app reviews, subscription complaints, app compatibility issues, mobile product feedback, app QA feedback, review clustering, Vietnamese app reviews.

## Roadmap

Phase 16 runs the final publish-readiness matrix. Browser expansion, external-provider configuration, Apple App Store support, Reddit scraping, and automatic ticket creation remain deferred.
