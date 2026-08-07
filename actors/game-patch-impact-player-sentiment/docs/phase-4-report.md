# Phase 4 Report — Comparison Engine and Final Report

Date: 2026-08-07

## Scope

Phase 4 replaced the temporary collection-only dataset item with one final report per App ID. It adds sentiment thresholds, theme-rate and negative-share deltas, safeguarded new-issue/regression/improvement detection, feature-request comparison, confidence caps, deterministic summaries, bounded top themes, and final runtime wiring.

## Tests

Commands and results:

| Command                               | Result                                    |
| ------------------------------------- | ----------------------------------------- |
| `npm test`                            | 16 files, 50 tests passed                 |
| `npm run lint`                        | passed                                    |
| `npm run build`                       | passed                                    |
| `npm run format:check`                | passed                                    |
| `npm run validate:schema`             | input, dataset, and output schemas passed |
| `npm run test:core` (repository root) | 10 shared-core tests passed               |

Focused comparison tests cover all sentiment thresholds, floating-point boundary stability, theme safeguards, feature-request counts, evidence omission, confidence caps, warning propagation, deterministic summaries, and final report shape.

## Local runtime matrix

All runs used public Steam endpoints and produced dataset items without secrets, a browser, or a proxy.

| Case                               | Output                                                             |      Samples | Coverage                    |                  Requests/scan | Warnings                                                         | Runtime |
| ---------------------------------- | ------------------------------------------------------------------ | -----------: | --------------------------- | -----------------------------: | ---------------------------------------------------------------- | ------: |
| Default `646570`, rolling          | `ok`, one final report                                             |      40 / 40 | full / full                 |          3 pages / 300 reviews | none                                                             | 1.496 s |
| `646570`, latest-patch fallback    | `ok`, effective rolling mode; rejected candidate confidence `0.35` |      20 / 20 | full / full                 | 20 news, 3 pages / 300 reviews | `PATCH_DETECTION_FALLBACK`                                       | 1.786 s |
| `646570`, custom date `2026-07-31` | `ok`, custom boundary                                              |      20 / 20 | full / full                 |          3 pages / 300 reviews | none                                                             | 1.585 s |
| `646570` + `570`, rolling          | 2 `ok` reports, one per App ID                                     | 10 / 10 each | full / full each            |       17 pages / 1,700 reviews | none                                                             | 6.269 s |
| Invalid-style App ID `999999999`   | `partial`, one safe report                                         |        0 / 0 | insufficient / insufficient |             1 page / 0 reviews | `GAME_NAME_UNAVAILABLE`, `LOW_SAMPLE_BEFORE`, `LOW_SAMPLE_AFTER` | 0.539 s |

The latest-patch run kept the requested mode visible, rejected a low-confidence newsletter candidate, fell back to rolling windows, and preserved `PATCH_DETECTION_FALLBACK`. The `includeEvidence=false` run emitted empty evidence arrays. The invalid-style input did not terminate the run or suppress its dataset item; it returned `insufficient_data` with low confidence.

## Runtime quality fixes found during inspection

- Unmatched prose is no longer forced into the `other` theme.
- Generic prose containing “add” is no longer treated as a feature request; extraction now requires a request-oriented phrase such as “please add”, “can we get”, or “option to”.
- Final runtime no longer stores `GAME_<APP_ID>_COLLECTION`; raw normalized reviews remain an internal handoff between collection and analysis only.
- Multi-game processing runs in bounded batches of at most three games and still emits one dataset item per App ID.

## Remaining risks

- Theme and request extraction remains deterministic keyword classification, so ambiguous or non-English text can be under-classified.
- Steam's `recent` endpoint can still hit the 30-page safety cap for very high-volume titles; the report exposes partial coverage and caps confidence.
- Patch discovery remains heuristic metadata and is never a causal claim.
- Product/schema/readiness hardening and cloud verification remain in Phase 5/6.

## Exit decision

Phase 4 is ready to advance. The Actor now emits the handoff-shaped final report, preserves coverage and fallback warnings, and passes the local default/matrix gates.
