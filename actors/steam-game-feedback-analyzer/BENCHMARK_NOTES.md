# Benchmark notes

## Phase 1 raw-review smoke

Date: 2026-07-31

Input: `storage/key_value_stores/default/INPUT.json` with app `730`, English reviews, and `maxReviewsPerGame: 5`.

Command:

```bash
apify run --purge
```

Observed local result:

| Metric            |        Result |
| ----------------- | ------------: |
| Games requested   |             1 |
| Games processed   |             1 |
| Games failed      |             0 |
| Reviews requested |             5 |
| Reviews collected |             5 |
| Reviews pushed    |             5 |
| Errors            |             0 |
| Runtime           | 0.679 seconds |

The local dataset contained five schema-shaped normalized review records and `RUN_STATS` contained the counters above. Local storage is not an Apify Cloud result. Cloud validation and publication remain explicit later decisions; this project does not publish automatically.

## Phase 2 feedback-analysis smoke

Date: 2026-07-31

Input: app `730`, English reviews, `feedbackAnalysis` mode, and `maxReviewsPerGame: 20`.

Observed local result:

| Metric                                 |        Result |
| -------------------------------------- | ------------: |
| Games requested / processed            |         1 / 1 |
| Reviews requested / collected / pushed |  20 / 20 / 20 |
| Reviews analyzed                       |            20 |
| Analyses succeeded / failed            |        20 / 0 |
| Errors                                 |             0 |
| Runtime                                | 0.771 seconds |

The dataset contained twenty review records with `analysisStatus: "success"` and validated analysis objects. This is a deterministic taxonomy smoke run; it does not claim human-labeled accuracy or an external model cost.

## Phase 3 multi-game report smoke

Date: 2026-07-31

Input: apps `730` and `570`, `languages: ["all"]`, `feedbackAnalysis`, aggregation enabled, and `maxReviewsPerGame: 10`.

Observed local result:

| Metric                                        |        Result |
| --------------------------------------------- | ------------: |
| Games requested / processed                   |         2 / 2 |
| Dataset review records                        |            20 |
| `GAME_730_REPORT.statistics.reviewsCollected` |            10 |
| `GAME_570_REPORT.statistics.reviewsCollected` |            10 |
| Analysis successes / failures                 |        20 / 0 |
| Errors                                        |             0 |
| Runtime                                       | 1.244 seconds |

The two key-value-store reports matched the per-game dataset counts. The all-language run also confirmed that Steam language tags outside the initial English/Vietnamese analysis taxonomy are preserved and safely classified as low-confidence/non-actionable when no matching taxonomy signal exists.

## Phase 4 clustering smoke

The same two-game bounded run produced 20 review records, zero cross-game cluster records, and zero cluster links because the small live sample did not contain two actionable topic-compatible duplicates. Synthetic fixture tests cover positive clustering, type partitioning, stable IDs, and review links; no cross-game cluster was produced in either path.

## Phase 5 benchmark inputs

Two bounded single-game runs were executed for the release candidate:

- English: app `730`, 25 requested/collected/analyzed, 25 successful analyses, 0.680 seconds.
- Vietnamese: app `730`, 25 requested/collected/analyzed, 25 successful analyses, one cluster containing two linked reviews, 0.683 seconds.

The live samples verify collection stability, schema-shaped output, and partial-failure-safe execution. They are not independently hand-labeled accuracy samples; the quality limitations and required human review are recorded in `validation/benchmark-report.md`.

## Phase 6 patch-impact smoke

Input: app `730`, English reviews, patch `1.4` at `2026-07-31T00:00:00.000Z`, one day before/after, and five reviews per period.

Observed local result: 5 before reviews, 5 after reviews, 10 analyzed reviews, 0 errors, 2.192 seconds. The key-value store contained `GAME_730_PATCH_IMPACT_REPORT` with topic deltas, improved topics, no new issues, no possible regressions, and the explicit non-causal disclaimer.

Phase 0 live probes also verified app IDs 730 and 570, cursor pagination, English/Vietnamese language parameters, and app-details metadata. See `TECHNICAL_SPIKE.md` and `test/fixtures/steam/`.

## Phase 7 cloud validation

Date: 2026-07-31

Actor: `obliging_persimmon_cki/steam-game-feedback-analyzer`, build `0.1.2` / `latest`.

Run: `6DP2ClygGAUzktfr7` with the bounded input in `samples/input.cloud-smoke.json` (app `730`, English reviews, `feedbackAnalysis`, aggregation enabled, and `maxReviewsPerGame: 10`).

Observed Apify Cloud result:

| Metric                                        |                 Result |
| --------------------------------------------- | ---------------------: |
| Run status                                    |            `SUCCEEDED` |
| Reviews collected / pushed                    |                10 / 10 |
| Reviews analyzed / successful                 |                10 / 10 |
| Dataset items                                 |    10 (review records) |
| Clusters pushed                               |                      0 |
| Errors                                        |                      0 |
| `GAME_730_REPORT` positive / negative reviews |                  6 / 4 |
| `GAME_730_REPORT` actionable reviews          |                      1 |
| Actor runtime                                 |          1.042 seconds |
| Apify run duration                            |          2.891 seconds |
| Observed usage cost                           | approximately $0.00085 |

The cloud dataset and key-value store contained schema-shaped records, `RUN_STATS`, and `GAME_730_REPORT`. This live sample did not produce a duplicate cluster; the earlier bounded cloud run and synthetic fixtures cover positive clustering. The post-push run validates the latest build's runtime and output wiring; it is not a human-labeled accuracy benchmark. The run was performed before publication; the Actor was subsequently published under the `GAMES` category without changing pricing.

## Phase 8 automation-default regression smoke

Date: 2026-08-04

The failed Apify automation test submitted the schema defaults without `steamAppIds` or `startUrls`, which previously caused input normalization to fail before Steam was contacted. The release candidate now defaults that empty selection to app `730` (Counter-Strike 2) and preserves the existing validation for explicitly empty selections.

Validation evidence:

- Unit normalization tests: 14 passed, including the empty automation-input regression.
- Local bounded smoke input omitted both game-selection fields and used `maxReviewsPerGame: 5`: 1 game processed, 5 reviews collected/pushed, 5 analyses succeeded, 0 errors, 0.789 seconds.
- The post-deployment cloud smoke will use the same empty game-selection input to verify the Console automation path.

Cloud result: build `0.1.7` / `latest`, run `ZpAyG6Q3dTcSTg0Rn`, status `SUCCEEDED`. The Actor processed 1/1 game, collected and pushed 5/5 reviews, completed 5/5 analyses, recorded 0 errors, and reported 0.822 seconds Actor runtime. Apify reported 3.091 seconds run duration and approximately `$0.000868` usage cost. Dataset and `RUN_STATS` were created successfully.
