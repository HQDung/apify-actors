# Phase 3 Report — Shared-Core Analysis Integration

Date: 2026-08-07

## Scope

Phase 3 added the thin Steam-to-shared-core adapter, a game-specific deterministic taxonomy, independent period analysis, language aggregation, feature-request extraction, and bounded evidence snippets. Steam's `positive` recommendation remains the only sentiment input; review text is used for gaming theme and request classification.

## Tests

Commands and results:

| Command                               | Result                                    |
| ------------------------------------- | ----------------------------------------- |
| `npm test`                            | 12 files, 37 tests passed                 |
| `npm run lint`                        | passed                                    |
| `npm run build`                       | passed                                    |
| `npm run format:check`                | passed                                    |
| `npm run validate:schema`             | input, dataset, and output schemas passed |
| `npm run test:core` (repository root) | 10 shared-core tests passed               |

The new tests cover normalized contract validation, Steam recommendation sentiment, gaming themes, feature requests, period rates, language counts, evidence caps, and evidence omission.

## Manual fixture validation

Three deterministic in-memory fixtures were analyzed with evidence enabled:

| Fixture               | Result                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Mostly positive       | 2/2 positive; gameplay, controls/input, graphics, and performance themes detected                                           |
| Mixed                 | 1/2 positive; matchmaking and network themes plus one practice-mode request detected; English/German distribution preserved |
| Bug/performance-heavy | 0/2 positive; performance mentioned twice, with crashes/stability, bugs, and controls/input also detected                   |

Each theme keeps at most two evidence records. With `includeEvidence=false`, theme evidence is an empty array. Results are deterministic for the same records and contain no provider or network dependency.

## Design notes

- `toNormalizedFeedback` validates every mapped record through `@project/feedback-analysis-core` before analysis.
- `GAME_TAXONOMY` extends the shared taxonomy with game-specific themes such as crashes/stability, servers/network, progression/grind, Steam Deck, and controls/input.
- `analyzePeriod` aggregates positive/negative counts from Steam recommendation fields and computes theme mention rates and negative shares without inferring causality.
- Evidence is short, review-ID keyed, and capped per theme/request to keep final reports bounded.

## Remaining risks

- The taxonomy is intentionally deterministic and keyword-based; ambiguous language and non-English text can be under-classified until a future provider-backed option is justified.
- The adapter currently keeps product metadata separate from review analysis; Phase 4 will assemble the metadata, period analysis, comparison, confidence, and final report shape.
- The Phase 1 collection snapshot remains in the runtime until Phase 4 replaces it with the final report.

## Exit decision

Phase 3 is ready to advance. Shared-core validation and period-level analysis are green, bounded, deterministic, and ready for the Phase 4 comparison engine.
