# Publish Readiness Report

Date: 2026-08-07

## Decision

**PUBLISHED AND VERIFIED**

The cloud default run succeeded on build `0.1.1` at the intended 256 MB allocation. The dataset contained one final report, both periods had 40 analyzed reviews with full/full coverage, no warnings were emitted, and `RUN_STATS` reported 300 scanned and 80 analyzed reviews. The Actor produced no raw collection snapshot.

## Cloud evidence

Actor: `game-patch-impact-player-sentiment` (`ZFrA2SSephNkHtKY0`)

Build: `0.1.1` (`7vtd1NcoXkorO3aze`)

| Case                  | Run                 | Result    | Output                                | Coverage                              |                           Memory |     Actor runtime |
| --------------------- | ------------------- | --------- | ------------------------------------- | ------------------------------------- | -------------------------------: | ----------------: |
| Default               | `K1b6luSS3IdMrzZon` | succeeded | 1 `ok` report, 40/40 samples          | full/full, no warnings                | 34.28 MB peak / 256 MB allocated |           0.868 s |
| Latest-patch fallback | `jIe2K51PJpQGWA3kD` | succeeded | 1 `ok` report, effective rolling mode | full/full, `PATCH_DETECTION_FALLBACK` | 41.05 MB peak / 256 MB allocated |           1.034 s |
| Custom date           | `POhQPcBAeGkfnNuzh` | succeeded | 1 `ok` report, 20/20 samples          | full/full                             | 38.33 MB peak / 256 MB allocated |           0.859 s |
| Two games             | `h3hHizGsE34oOFy04` | succeeded | 2 `ok` reports, one per App ID        | full/full for both                    | 43.23 MB peak / 256 MB allocated | 0.786 s + 3.270 s |
| Invalid-style ID      | `Gjln3nc63RG5FXIFM` | succeeded | 1 `partial` report, 0/0 samples       | insufficient/insufficient             | 38.69 MB peak / 256 MB allocated |           0.304 s |

Cloud CLI summaries rounded each matrix cost to `$0.000`. The default run’s detailed usage total was `$0.0001508511`; no pricing configuration was changed.

## Release checks

- 18 Actor test files / 55 tests passed.
- 10 shared-core tests passed.
- Lint, build, formatting, input/dataset/output schemas, and Actor release validator passed.
- Default local and cloud runs require no secret, browser, proxy, or external model.
- Coverage and insufficient-data warnings remain visible; patch detection fallback is explicit.
- Store guidance recommends approximately `$0.03` per successful `game_report` as a starting principle only; pricing remains unchanged.

## Post-publish verification

Public Actor: https://apify.com/obliging_persimmon_cki/game-patch-impact-player-sentiment

The published Actor was called with the default sample input after publication:

- Run `40HgddaBo3jAVTsVK`: succeeded, exit code 0, build `0.1.1`.
- Dataset `tdgUyjmCHIVUax47x`: one `ok` report for Slay the Spire (`646570`), 40 before / 40 after analyzed reviews, full/full coverage, and no warnings.
- `RUN_STATS` in key-value store `gLStGQBHdtrVMUJxs`: 300 reviews scanned, 80 analyzed, 3 review pages, 1,169 ms total run duration.
- Runtime: 256 MB allocated, 39.32 MB peak memory, 2 seconds wall time.

The public post-publish smoke therefore matched the validated build contract. Pricing remained unchanged.
