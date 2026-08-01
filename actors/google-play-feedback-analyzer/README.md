# Google Play Feedback Analyzer

Collect bounded public Google Play review records for one or more Android apps. The current release uses the public Store HTML page, preserves locale and market parameters, and emits source diagnostics so later phases can add shared feedback analysis without coupling it to collection.

## What it collects

- Review ID, star rating, localized date text, review text, and helpful count.
- Optional developer reply text and date when present in the public card.
- Language and country used for the request.
- A machine-readable diagnostic record for every app, including HTTP status, response size, and parsed-card count.

The public page currently exposes a bounded server-rendered sample, not complete review history. The browser expansion path and analysis engine are intentionally deferred to later phases.

## Input

| Field                | Required | Default        | Description                                                                    |
| -------------------- | -------- | -------------- | ------------------------------------------------------------------------------ |
| `appIds`             | yes      | —              | Android package IDs, up to 20.                                                 |
| `language`           | no       | `en`           | Two- or three-letter Google Play language code.                                |
| `country`            | no       | `US`           | Two-letter Google Play market code.                                            |
| `maxReviewsPerApp`   | no       | `50`           | Hard cap from the parsed server-rendered sample, 1–500.                        |
| `sort`               | no       | `mostRelevant` | `mostRelevant` or `newest`; recorded for diagnostics in the current HTML path. |
| `useBrowserFallback` | no       | `false`        | Reserved for the later browser-expansion phase.                                |
| `requestTimeoutSecs` | no       | `30`           | Per-request timeout, 5–120 seconds.                                            |

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

## Output fields

| Field                           | Description                                               |
| ------------------------------- | --------------------------------------------------------- |
| `recordType`                    | `review` or `sourceDiagnostic`.                           |
| `appId`                         | Android package ID.                                       |
| `reviewId`                      | Public Google Play review ID, for review records.         |
| `rating`                        | Integer star rating from 1 to 5.                          |
| `reviewDateText`                | Locale-preserved date text from the public page.          |
| `text`                          | Public review text, for review records.                   |
| `helpfulCount`                  | Helpful count when exposed, otherwise `null`.             |
| `developerReply`                | Optional reply object with presence, date text, and text. |
| `source.language`               | Language request parameter.                               |
| `source.country`                | Country request parameter.                                |
| `diagnostics.httpStatus`        | HTTP status for the Store response.                       |
| `diagnostics.responseBytes`     | Response size in bytes.                                   |
| `diagnostics.parsedReviewCount` | Number of unique review cards parsed before the cap.      |
| `diagnostics.collectionMode`    | Current value is `html`.                                  |
| `error.code`                    | Machine-readable source error code when collection fails. |

## Local run

```bash
npm install
apify validate-schema
apify run --purge --input-file sample-input.json
```

The local dataset and `RUN_STATS` key-value record are written under `storage/`. They are local verification artifacts and are not published automatically.

## Source limitations

- Google Play localizes markup labels and dates; parsing uses structural selectors and star classes rather than English-only labels.
- Direct HTML normally contains a small sample. “See all reviews” browser expansion is a later phase.
- App version and device metadata are nullable until a stable public fixture proves those fields.
- Public HTML is untrusted input; the Actor bounds requests, strips markup through Cheerio, validates ratings, deduplicates review IDs, and does not emit reviewer names or avatar URLs.
- The authenticated Google Play Developer API is a separate app-owner source and is not used for arbitrary public apps.

## Roadmap

Phase 9 adds normalized source contracts and browser-fallback diagnostics. Later phases connect the neutral records to the shared feedback-analysis core, clustering, aggregation, reports, and benchmarks.
