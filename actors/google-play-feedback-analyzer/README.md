# Google Play Feedback Analyzer

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

## Input

| Field                 | Required      | Default        | Description                                                                           |
| --------------------- | ------------- | -------------- | ------------------------------------------------------------------------------------- |
| `mode`                | no            | `reviews`      | `reviews` for normal collection or `releaseImpact` for a bounded before/after report. |
| `appIds`              | yes           | —              | Android package IDs, up to 20.                                                        |
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

| Field                                                   | Description                                                                                          |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `recordType`                                            | `review`, `sourceDiagnostic`, `feedbackCluster`, `productFeedbackReport`, or `feedbackImpactReport`. |
| `appId`                                                 | Android package ID.                                                                                  |
| `reviewId`                                              | Public Google Play review ID, for review records.                                                    |
| `rating`                                                | Integer star rating from 1 to 5.                                                                     |
| `reviewDateText`                                        | Locale-preserved date text from the public page.                                                     |
| `text`                                                  | Public review text, for review records.                                                              |
| `helpfulCount`                                          | Helpful count when exposed, otherwise `null`.                                                        |
| `developerReply`                                        | Optional reply object with presence, date text, and text.                                            |
| `source.language`                                       | Language request parameter.                                                                          |
| `source.country`                                        | Country request parameter.                                                                           |
| `diagnostics.httpStatus`                                | HTTP status for the Store response.                                                                  |
| `diagnostics.responseBytes`                             | Response size in bytes.                                                                              |
| `diagnostics.collectedAt`                               | Collection timestamp for the source response.                                                        |
| `diagnostics.parsedReviewCount`                         | Number of unique review cards parsed before the cap.                                                 |
| `diagnostics.collectionMode`                            | Current value is `html`.                                                                             |
| `error.code`                                            | Machine-readable source error code when collection fails.                                            |
| `normalizedFeedback`                                    | Source-neutral feedback object validated by shared core.                                             |
| `analysis`                                              | Shared-core analysis result, when analysis is enabled.                                               |
| `product.productId`                                     | App ID on aggregate and impact records.                                                              |
| `clusterId`                                             | Stable cluster ID on feedback-cluster records.                                                       |
| `canonicalIssue`                                        | Canonical issue or request title for a cluster.                                                      |
| `feedbackType`                                          | Cluster feedback type, such as `bugReport`.                                                          |
| `mentionCount`                                          | Number of reviews in a cluster.                                                                      |
| `statistics`                                            | Counts, rating, language, country, and version summaries.                                            |
| `topIssues` / `topFeatureRequests`                      | Ranked app-level issue and request summaries.                                                        |
| `topicChanges` / `possibleRegressions`                  | Observed before/after topic changes when enabled.                                                    |
| `release` / `windows`                                   | Release metadata and exact non-overlapping comparison windows.                                       |
| `statistics.ratingChange`                               | Difference between before and after average ratings when both exist.                                 |
| `issueChanges` / `featureRequestChanges`                | New, increasing, decreasing, and unchanged analytical signals.                                       |
| `countryChanges` / `languageChanges` / `versionChanges` | Dimension-specific review volume changes.                                                            |
| `warnings`                                              | Structured `NO_REVIEWS`, `LIMITED_DATA`, or future-release warnings.                                 |
| `disclaimer`                                            | Caution that release comparisons are observational, not causal proof.                                |

Aggregate reports are also stored under `APP_REPORT_<app-id>` in the default key-value store. Reports tolerate partial analysis failures by counting only successful analyses in ranked intelligence while retaining collection counts.

In `releaseImpact` mode, the enriched report is also stored under `APP_RELEASE_IMPACT_<app-id>`. Reviews exactly at `release.releasedAt` belong to the after window; reviews before it belong to the before window. Empty or small windows remain structured rather than being presented as proof of a regression.

The dataset schema provides thematic views for Reviews, Issue clusters, App reports, and Release impact reports. The views are projections over the same dataset; `recordType` remains the authoritative discriminator.

## Local run

```bash
npm install
apify validate-schema
apify run --purge --input-file sample-input.json
```

The local dataset and `RUN_STATS` key-value record are written under `storage/`. They are local verification artifacts and are not published automatically.

## Benchmark evidence

The Phase 13 five-app matrix processed 15 reviews with 15 deterministic analyses, 0 collection errors, 0 analysis failures, 5 aggregate reports, 6.56 MB of public response data, 1.889 seconds runtime, and 200 MiB reported process RSS. See [`BENCHMARK_NOTES.md`](BENCHMARK_NOTES.md), [`docs/BENCHMARK_REPORT.md`](docs/BENCHMARK_REPORT.md), [`docs/QUALITY_REVIEW.md`](docs/QUALITY_REVIEW.md), and [`docs/COST_REPORT.md`](docs/COST_REPORT.md) for scope and limitations. These are operational measurements, not human-labeled accuracy claims.

## Source limitations

- Google Play localizes markup labels and dates; parsing uses structural selectors and star classes rather than English-only labels.
- Direct HTML normally contains a small sample. “See all reviews” browser expansion is a later phase.
- App version and device metadata are nullable until a stable public fixture proves those fields.
- Public HTML is untrusted input; the Actor bounds requests, strips markup through Cheerio, validates ratings, deduplicates review IDs, and does not emit reviewer names or avatar URLs.
- The authenticated Google Play Developer API is a separate app-owner source and is not used for arbitrary public apps.

## Roadmap

Phase 12 adds explicit release-impact mode, multi-language/country request expansion, rating and issue deltas, and structured data-sufficiency warnings. Browser expansion and external-provider analysis remain deferred.
