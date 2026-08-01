# Steam Game Reviews & Player Feedback Analyzer

Collect public Steam reviews and turn player feedback into structured bug signals, feature requests, topics, sentiment, and game-level reports.

## What this Actor does

The Actor calls Steam’s public review and app-details endpoints, normalizes review metadata, preserves source-language labels, and optionally applies a deterministic English/Vietnamese feedback taxonomy. It separates raw collection from analysis so teams can export low-cost source data or receive structured product feedback in the same dataset.

Detected issues are reported player claims, not confirmed engineering bugs.

## Who it is for

- Indie developers and game studios
- Publishers, product managers, QA, and community teams
- Localization teams and Steam Deck support teams
- Game-market researchers and feedback analytics pipelines

## Key features

- Multiple Steam app IDs or Store/community URLs in one run
- Recent or bounded historical review collection with cursor pagination
- Positive, negative, purchase-type, date, and language filters
- Normalized review metadata with timestamps, votes, playtime, purchase, early-access, and Steam Deck signals
- English and Vietnamese analysis with language-neutral taxonomy IDs
- Bug, performance, stability, feature-request, controller, localization, multiplayer, and usability signals
- Actionability score and cautious severity estimate
- Duplicate issue clustering with stable IDs and review links
- One per-game aggregate report in the default key-value store
- Incremental output and partial-failure isolation

## Supported input

At least one of `steamAppIds` or `startUrls` is required. IDs from both sources are extracted, merged, and de-duplicated. The Console string-list editor represents app IDs as strings; the runtime also accepts numeric IDs.

```json
{
  "mode": "feedbackAnalysis",
  "steamAppIds": ["730"],
  "startUrls": [],
  "languages": ["english", "vietnamese"],
  "reviewFilter": "all",
  "purchaseType": "all",
  "dateRange": { "from": "", "to": "", "recentDays": 30 },
  "maxReviewsPerGame": 20,
  "includeReviewText": true,
  "analysis": {
    "enabled": true,
    "outputLanguage": "english",
    "clusterSimilarIssues": true
  },
  "aggregation": { "enabled": true },
  "proxyConfiguration": { "useApifyProxy": false }
}
```

Use `recentDays: 0` to disable the recent-days bound. `from` and `to` are inclusive ISO date strings; blank strings omit those bounds.

## Modes

### `rawReviews`

Collects normalized Steam review records without review-level analysis. This is the lowest-cost export mode.

### `feedbackAnalysis`

Collects reviews and attaches validated feedback analysis, actionability, topics, issue/request details, and optional duplicate clusters. This is the default mode.

### `patchImpact`

Compares bounded before/after review windows around a patch date. The report is stored under `GAME_<APP_ID>_PATCH_IMPACT_REPORT` and marks increased topics as possible regressions without making causal claims.

```json
{
  "mode": "patchImpact",
  "steamAppIds": ["730"],
  "languages": ["english"],
  "patch": {
    "releasedAt": "2026-07-20T00:00:00.000Z",
    "version": "1.4",
    "notesUrl": "https://example.com/patch-notes"
  },
  "daysBefore": 14,
  "daysAfter": 14,
  "maxReviewsPerPeriod": 100
}
```

## Output

Review and cluster records are pushed to the default dataset. Per-game reports are stored under `GAME_<APP_ID>_REPORT` in the default key-value store.

Example analyzed record:

```json
{
  "recordType": "review",
  "game": { "steamAppId": 730, "name": "Counter-Strike 2" },
  "review": {
    "reviewId": "1234567890",
    "language": "english",
    "text": "The game crashes when opening the inventory.",
    "recommended": false
  },
  "analysisStatus": "success",
  "analysis": {
    "isActionableFeedback": true,
    "actionabilityScore": 0.9,
    "primaryFeedbackType": "bugReport",
    "feedbackTypes": ["bugReport", "stabilityIssue"],
    "sentiment": "negative",
    "severity": "high",
    "topics": ["crashes", "inventory"],
    "summary": "The review reports a crash when opening the inventory.",
    "clusterId": "issue-730-bugreport-crash-when-opening-inventory"
  }
}
```

Example patch report fields include `topicChanges`, `newIssues`, `improvedTopics`, `possibleRegressions`, and an explicit non-causal disclaimer.

Example cluster record:

```json
{
  "recordType": "feedbackCluster",
  "clusterId": "issue-730-bugreport-crash-when-opening-inventory",
  "canonicalIssue": "Game crashes when opening the inventory",
  "feedbackType": "bugReport",
  "mentionCount": 47,
  "uniqueReviewCount": 47,
  "languages": ["english", "vietnamese"],
  "reviewIds": ["1234567890"]
}
```

## Output fields

| Field | Description |
| --- | --- |
| `recordType` | `review` or `feedbackCluster`. |
| `game.name` | Steam game name. |
| `game.steamAppId` | Numeric Steam app ID. |
| `review.language` | Language code returned by Steam. |
| `review.recommended` | Player recommendation flag. |
| `review.text` | Original review text, or `null` when disabled. |
| `analysisStatus` | `success` or `failed` when analysis is enabled. |
| `analysis.clusterId` | Stable link from a review to a duplicate-issue cluster. |
| `analysis.primaryFeedbackType` | Main taxonomy type. |
| `analysis.sentiment` | Positive, negative, mixed, or neutral. |
| `analysis.severity` | Estimated critical/high/medium/low/unknown severity. |
| `analysis.actionabilityScore` | Score from 0 to 1 for product-specific detail. |
| `analysis.topics` | Stable topic IDs such as `crashes`, `inventory`, or `steamDeck`. |
| `clusterId` | Stable ID on a `feedbackCluster` record. |
| `canonicalIssue` | Canonical issue title on a cluster record. |
| `feedbackType` | Primary feedback type represented by a cluster. |
| `mentionCount` | Number of source reviews represented by a cluster. |
| `source.scrapedAt` | Collection timestamp. |

## Feedback taxonomy

Primary feedback types include `bugReport`, `performanceIssue`, `stabilityIssue`, `featureRequest`, `balanceFeedback`, `difficultyFeedback`, `gameplayFeedback`, `contentRequest`, `usabilityIssue`, `accessibilityFeedback`, `localizationIssue`, `controllerIssue`, `steamDeckIssue`, `multiplayerIssue`, `serverIssue`, `matchmakingIssue`, `cheatingReport`, `monetizationFeedback`, `pricingFeedback`, `dlcFeedback`, `moddingFeedback`, `positiveFeedback`, `generalComplaint`, `nonActionable`, and `spamOrIrrelevant`.

Topics use stable IDs, including `crashes`, `freezes`, `stuttering`, `frameRate`, `loadingTime`, `disconnects`, `servers`, `matchmaking`, `saveSystem`, `combat`, `controls`, `controllerSupport`, `steamDeck`, `difficulty`, `balance`, `localization`, `subtitles`, `accessibility`, `userInterface`, `inventory`, `achievements`, `mods`, `antiCheat`, `coOp`, `pvp`, `earlyAccess`, `contentAmount`, and `replayability`.

Severity is an analytical estimate: `critical` indicates a possible launch/save/progression blocker, `high` indicates a major reported impact, `medium` indicates a meaningful but non-blocking issue, `low` indicates a minor issue or request, and `unknown` indicates insufficient context.

## Aggregated reports

When aggregation is enabled, one report per game is stored under `GAME_<APP_ID>_REPORT`. Reports contain review counts, analyzed/actionable counts, language distribution, top issues, feature requests, positive and negative topics, localization insights, and the review window. Report counts are calculated from the same records pushed to the dataset and remain valid when individual analyses fail.

## Language support

The collection layer accepts Steam language codes and preserves the code exactly as returned by Steam. The initial deterministic analysis taxonomy covers English and Vietnamese, while unknown or unsupported languages remain in the dataset with their original text and safe fallback classification. `sourceLanguage`, `analysisLanguage`, and `originalTextPreserved` make the normalization boundary explicit.

## Cost considerations

`rawReviews` avoids analysis work and is the lowest-cost mode. Analysis cost is bounded by `maxReviewsPerGame`, language filters, date filters, short-review handling, and duplicate review IDs. The current MVP uses a deterministic local analyzer and does not require a paid model provider; future provider-backed analysis must remain optional and preserve the same strict schema/fallback behavior.

This repository does not automatically publish the Actor or change pricing.

## Limitations

- Steam response formats, review availability, language tags, and rate limits can change.
- Steam language tags may not match the language of the text; the source tag is preserved rather than silently corrected.
- Reviews represent player opinions. Detected issues are not confirmed bugs, causes, regressions, or engineering priorities.
- Sarcasm, memes, very short reviews, mixed feedback, and unsupported languages can be misclassified.
- Cluster quality depends on topic and text similarity; review IDs are preserved for manual verification.
- The Actor does not scrape Reddit, Discord, esports data, price history, player-count predictions, sales estimates, patch notes, or media.

## Compliance and responsible use

The Actor processes public Steam review data only. It avoids reviewer names, avatars, profile URLs, social discovery, emails, and private account information; a public source ID may be retained solely for review provenance. Do not use the output to harass, profile, target, or identify individual reviewers. Respect Steam terms, robots/access policies, applicable privacy laws, and any downstream data-retention requirements.

## Benchmark results

See [`BENCHMARK_NOTES.md`](BENCHMARK_NOTES.md) for reproducible local Phase 0–6 results and the Phase 7 cloud smoke. The latest pushed build completed the bounded cloud input in [`samples/input.cloud-smoke.json`](samples/input.cloud-smoke.json) with 10/10 successful analyses, 10 review records, zero errors, and a saved per-game report. The cloud smoke validates deployment and output wiring; it is not a human-labeled accuracy benchmark. Quality targets such as feedback-type accuracy and false bug-report rate require a reviewed sample before a production launch.

The Actor is published in Apify Store under the `GAMES` category. Pricing remains pay for usage.

## FAQ

### Does this confirm bugs?

No. It extracts reported player feedback and estimates severity; engineering teams should reproduce and verify issues independently.

### Can I export raw reviews only?

Yes. Set `mode` to `rawReviews` and `analysis.enabled` to `false`.

### Can I request all languages?

Yes. Use `languages: ["all"]`. Preserve the returned language code and review text when evaluating unsupported languages.

### Where are game reports stored?

In the default key-value store under `GAME_<APP_ID>_REPORT`.

### Does it publish automatically?

No. Validation and deployment remain explicit operator actions.

## Roadmap

1. Add reviewed human-labeled quality benchmarks for English and Vietnamese.
2. Add optional provider-backed analysis behind the existing strict schema and fallback boundary.
3. Expand language-specific signals without creating separate Actors.
