# Phase 1 Report — Foundation and Steam Data Acquisition

Date: 2026-08-07

## Scope

Phase 1 implemented input normalization, bounded rolling/custom window calculation, deterministic sampling, Steam review pagination/retries, Steam review normalization, best-effort app metadata, coverage calculation, and a collection-only Apify runtime. Patch detection and feedback analysis are intentionally deferred to later phases.

## Tests

Commands and results:

| Command                   | Result                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm test`                | 8 files, 23 tests passed                                                                                |
| `npm run build`           | passed (`node --check src/main.js`)                                                                     |
| `npm run lint`            | passed                                                                                                  |
| `npm run format:check`    | passed for Actor-owned files; generated `storage/` and `package-lock.json` are ignored by the formatter |
| `npm run validate:schema` | input, dataset, and output schemas passed                                                               |

Coverage includes exact period boundaries, custom dates, insufficient/partial/full coverage, deterministic samples, URL-encoded cursors, retries, malformed responses, repeated cursors, normalization, metadata failures, and per-game collection failures.

## Default local smoke

Input: `sample-input.json` with App ID `646570`.

Command:

```bash
apify run --purge
```

Observed result:

| Metric                               |                                                          Result |
| ------------------------------------ | --------------------------------------------------------------: |
| Run status                           |                                                      successful |
| Games requested / processed / failed |                                                       1 / 1 / 0 |
| Review pages fetched                 |                                                               3 |
| Reviews scanned                      |                                                             300 |
| Reviews sampled/analyzed             |                                  40 before / 40 after; 80 total |
| Before coverage                      |                                                            full |
| After coverage                       |                                                            full |
| Warnings                             |                                                            none |
| Actor runtime                        |                                                   1.784 seconds |
| Dataset items                        |                                       1 collection-only summary |
| Key-value snapshot                   | `GAME_646570_COLLECTION` present with normalized period samples |

The final Phase 1 collection snapshot reached the requested before boundary and retained finite bounded arrays. The sample counts and coverage were also visible in `RUN_STATS` and the local dataset summary.

## Implementation notes

- `646570` remains the provisional default because it reached both seven-day periods in three review pages during Phase 0 and Phase 1.
- Steam-specific fields are normalized into the handoff contract before analysis.
- The first smoke attempt exposed that Apify CLI auto-detection requires a `start` script; adding `"start": "node src/main.js"` aligned the new package with the existing Actor convention.
- No browser, API key, proxy, external LLM, or unbounded pagination was introduced.

## Remaining risks

- The collection-only dataset item currently includes normalized period samples for Phase 1 observability; the final Phase 4 report will remove raw sample arrays from the default dataset output and retain only bounded evidence snippets.
- Steam language tags remain source labels and are not independently detected.
- High-volume games can still hit the fixed 30-page safety limit and will require partial/insufficient coverage handling in the final report.
- `latest_patch` is not active until Phase 2.

## Exit decision

Phase 1 is ready to advance: the default Actor collects bounded normalized BEFORE/AFTER samples with full coverage, and all Phase 1 validation commands pass. Phase 2 can add patch detection and explicit rolling-window fallback.
