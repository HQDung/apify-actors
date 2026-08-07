# Phase 2 Report — Patch Detection and Fallback

Date: 2026-08-07

## Scope

Phase 2 added the Steam news adapter, deterministic patch candidate scoring, latest-patch boundary resolution, and visible rolling-period fallback for low-confidence or unavailable news.

## Tests

Commands and results:

| Command                   | Result                                    |
| ------------------------- | ----------------------------------------- |
| `npm test`                | 10 files, 32 tests passed                 |
| `npm run lint`            | passed                                    |
| `npm run build`           | passed                                    |
| `npm run format:check`    | passed                                    |
| `npm run validate:schema` | input, dataset, and output schemas passed |

Phase 2 fixture coverage includes obvious patch notes, hotfixes, major updates, sales, community events, external articles, empty feeds, retryable news failures, threshold acceptance, and explicit `PATCH_DETECTION_FALLBACK` behavior.

## Live latest-patch smoke

Input: Dota 2 App ID `570`, `latest_patch`, seven-day periods, 20 sampled reviews per period, English language.

Command:

```bash
apify run --purge --input '{"steamAppIds":["570"],"comparisonMode":"latest_patch","windowDays":7,"maxReviewsPerPeriod":20,"language":"english","includeOffTopicReviews":false,"includeEvidence":true}'
```

Observed result:

| Metric               |                                Result |
| -------------------- | ------------------------------------: |
| Run status           |                            successful |
| Effective mode       |                        `latest_patch` |
| Detected patch       | Gameplay Patch 7.41e and Summer Scrub |
| Patch boundary       |            `2026-07-30T23:58:15.000Z` |
| Patch confidence     |                      `1.00`, accepted |
| News items fetched   |                                    20 |
| Review pages fetched |                                    14 |
| Reviews scanned      |                                 1,400 |
| Reviews sampled      |                  20 before / 20 after |
| Coverage             |                             full/full |
| Warnings             |                                  none |
| Actor runtime        |                         7.194 seconds |

## Regression discovered and fixed

The first live run showed Steam reporting `is_external_url=true` for a first-party Community Announcement URL under `steam_community_announcements`. The candidate was accepted at the threshold but incorrectly labeled as an external article. A sanitized regression fixture now reproduces that response shape, and the adapter treats Community Announcement URLs as first-party source evidence. The verified live result now emits `isExternal=false`, the `Steam announcement` signal, and confidence `1.00`.

## Fallback behavior

Fixture tests confirm that a sale, event, external article, empty feed, or news request failure does not silently become a patch. The runtime keeps the requested mode as `latest_patch`, sets `effectiveComparisonMode=recent_vs_previous`, emits `PATCH_DETECTION_FALLBACK`, and adds `NEWS_ENDPOINT_UNAVAILABLE` when the endpoint itself fails.

## Remaining risks

- The current collection snapshot still exposes normalized review samples for the Phase 1 gate; Phase 4 will replace that with the final intelligence report and short evidence only.
- Patch scoring remains heuristic and should be treated as best-effort metadata, not causal proof.
- Dota 2 needed 14 pages to reach the requested historical boundary; high-volume titles can still hit the 30-page cap.
- Period analysis, sentiment deltas, theme deltas, confidence, and final report output are deferred to Phase 3 and Phase 4.

## Exit decision

Phase 2 is ready to advance. `latest_patch` accepts credible updates, rejects common non-patch announcements, and has a visible rolling-period fallback with live confirmation on a stable public game.
