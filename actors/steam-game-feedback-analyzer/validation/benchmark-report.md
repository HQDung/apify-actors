# Benchmark report — Steam Game Reviews & Player Feedback Analyzer

Date: 2026-07-31

## Scope

This report covers local bounded runs and one bounded Apify Cloud run against Steam’s public review endpoint. Local Actor storage is not an Apify Cloud result. No publish or pricing action was performed.

## Collection and runtime results

| Run                  | Apps     | Language filter                 | Reviews | Analysis success |                        Clusters |       Runtime |
| -------------------- | -------- | ------------------------------- | ------: | ---------------: | ------------------------------: | ------------: |
| English smoke        | 730      | `english`                       |      25 |            25/25 | not retained after the next run |       0.680 s |
| Vietnamese smoke     | 730      | `vietnamese`                    |      25 |            25/25 |    1 cluster / 2 linked reviews |       0.683 s |
| Multi-game smoke     | 730, 570 | `all`                           |      20 |            20/20 |           0 cross-game clusters |       1.252 s |
| Patch-impact smoke   | 730      | `english`, one day before/after |   5 + 5 |            10/10 |                report generated |       2.192 s |
| Cloud feedback smoke | 730      | `english`                       |      10 |            10/10 |                 0 live clusters | 2.891 s cloud |

The Vietnamese run produced one stable cluster for two cheating/anti-cheat concerns. The multi-game run produced no cluster spanning games. The two per-game report counts matched the ten review records per app in that run.

The patch-impact run generated `GAME_730_PATCH_IMPACT_REPORT` with five before reviews, five after reviews, topic deltas, and a non-causal disclaimer.

The latest cloud feedback smoke ran Actor build `0.1.2` / `latest` as run `6DP2ClygGAUzktfr7`. It produced 10 review records in the default dataset, saved `RUN_STATS` and `GAME_730_REPORT`, reported zero errors, and used approximately `$0.00085`. The per-game report contained 10 collected/analyzed reviews, 6 positive, 4 negative, and 1 actionable review. The live sample produced no duplicate cluster; the earlier cloud run and fixture tests cover positive clustering. Actor runtime was 1.042 seconds; Apify measured 2.891 seconds for the run.

## Quality review status

The automated fixture corpus covers 12 labeled cases: crash, generic complaint, praise, feature request, performance, controller, Steam Deck, localization, Vietnamese, short, meme, and mixed issues. The 25-English/25-Vietnamese live runs verified schema validity and run stability, but they were not independently hand-labeled for accuracy. Feedback-type accuracy, topic accuracy, severity reasonableness, summary faithfulness, false bug-report rate, and cluster coherence therefore remain a manual release follow-up rather than fabricated metrics.

## Release interpretation

The Actor passed the bounded cloud execution and output-wiring check on the pushed build. It is now public in Apify Store under the `GAMES` category with its existing pay-for-usage pricing; no pricing change was made. The cloud smoke is not a human-labeled accuracy benchmark, so the known quality limitations still require human review.
