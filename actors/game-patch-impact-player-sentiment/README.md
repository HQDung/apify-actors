# Game Patch Impact & Player Sentiment Intelligence

## What this Actor does

This Actor does not simply return Steam reviews. It compares player feedback across two time periods and surfaces sentiment shifts, newly emerging issues, regressions, improvements, and feature requests.

## Who it is for

Game studios, publishers, QA teams, community managers, analysts, and game researchers who need a compact update-impact signal from public Steam feedback.

## Key features

- Recent-vs-previous, latest-detected-patch, and custom-date comparisons.
- Steam recommendation rates and deterministic sentiment deltas.
- Gaming issue themes, feature requests, short evidence, coverage metadata, and confidence.
- Bounded pagination with partial-coverage warnings and per-game failure isolation.

## Supported input

See `sample-input.json` for the safe Store-test input. The Actor accepts one to ten numeric Steam App IDs, a period length from 1 to 30 days, and a sample cap from 10 to 250 reviews per period.

## Output

The default dataset contains one final report per Steam App ID with `comparison`, `impact`, `patch`, `newIssues`, `regressions`, `improvements`, `featureRequests`, `topNegativeThemes`, `topPositiveThemes`, `coverage`, `languageDistribution`, `warnings`, and bounded `stats` fields. Raw review collections are not published as the primary output.

## Output fields

| Field                               | Meaning                                                 |
| ----------------------------------- | ------------------------------------------------------- |
| `status`                            | `ok`, `partial`, or `failed` report status.             |
| `steamAppId`                        | Requested numeric Steam App ID.                         |
| `gameName`                          | Best-effort Steam game name.                            |
| `requestedComparisonMode`           | Mode supplied in the input.                             |
| `effectiveComparisonMode`           | Mode actually used after patch fallback.                |
| `comparison.before.positiveRate`    | Steam recommendation rate before the boundary.          |
| `comparison.after.positiveRate`     | Steam recommendation rate after the boundary.           |
| `comparison.sentimentDelta`         | After minus before positive recommendation rate.        |
| `impact.direction`                  | Thresholded sentiment direction or `insufficient_data`. |
| `impact.confidence`                 | Bounded 0–1 confidence score.                           |
| `impact.confidenceLabel`            | `high`, `medium`, or `low`.                             |
| `comparison.before.reviewsAnalyzed` | Before-period analyzed sample count.                    |
| `comparison.after.reviewsAnalyzed`  | After-period analyzed sample count.                     |
| `coverage.before.coverageStatus`    | Before-period `full`, `partial`, or `insufficient`.     |
| `coverage.after.coverageStatus`     | After-period `full`, `partial`, or `insufficient`.      |
| `newIssues`                         | Complaint themes meeting the new-issue safeguards.      |
| `regressions`                       | Themes meeting the regression safeguards.               |
| `improvements`                      | Themes with a material negative-mention decrease.       |
| `featureRequests`                   | Bounded normalized requests and counts.                 |
| `warnings`                          | Coverage, fallback, or enrichment warnings.             |
| `stats.durationMs`                  | Bounded per-game runtime in milliseconds.               |
| `generatedAt`                       | Report generation timestamp.                            |

## Limitations

Steam's recent-review API is paginated chronologically. On extremely high-volume games, a run may hit its safety scan limit before reaching the complete requested historical window. In this case the Actor returns partial coverage and lowers confidence instead of presenting incomplete data as a full comparison.

This V1 uses public Steam data and deterministic local analysis. It does not claim that a patch caused an observed change, and it does not collect Reddit, Discord, YouTube, or Metacritic data.

## Cost considerations

The recommended pricing principle is pay per successfully generated game report, not per raw review. A starting target is approximately `$0.03` per `game_report`, subject to measured Apify usage economics. This repository does not change pricing automatically.

## Compliance and responsible use

Review snippets are short evidence for aggregate analysis, not endorsements. Do not use output to identify, target, or harass individual reviewers. Respect Steam terms and applicable privacy/data-retention requirements.

## FAQ

### Does this confirm that a patch caused a bug?

No. It reports observational changes in player feedback; engineering teams should reproduce and verify issues independently.

### What happens when Steam history is incomplete?

The report marks coverage as partial or insufficient, lowers confidence, and includes a warning rather than claiming full coverage.

## API usage

Run the Actor with a JSON object matching `sample-input.json` using Apify's API or Console. The default input requires no API key, proxy, browser, or external model.

```json
{
    "steamAppIds": ["646570"],
    "comparisonMode": "recent_vs_previous",
    "windowDays": 7,
    "maxReviewsPerPeriod": 40,
    "language": "english",
    "includeOffTopicReviews": false,
    "includeEvidence": true
}
```

## Benchmark results

Phase 0 feasibility measurements are recorded in the repository-level `docs/phase-0-feasibility.md`. Phase-specific runtime and cloud evidence will be appended to `BENCHMARK_NOTES.md` as implementation proceeds.
