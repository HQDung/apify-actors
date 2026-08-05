# Phase 8 report — run-to-run change detection

Checked 2026-08-05.

## Acceptance result

| Criterion | Result | Evidence |
| --- | --- | --- |
| Change detection is disabled by default | Pass | Default run emitted `changeDetection.enabled: false`; `CHANGE_REPORT` was still written with `enabled: false`. |
| Change detection does not affect the Store auto-test path | Pass | Default input remains `detectChanges: false`; `apify run --purge` exited 0 and produced exactly one snapshot in 14 seconds. |
| Price changes include old/new values and currency | Pass | Phase 8 tests assert `{ price, currency }` on both sides of a price change. |
| Stock changes ignore text-only formatting changes | Pass | Phase 8 test changes `stockText` only while retaining normalized `stockStatus`; no stock change is emitted. |
| New volumes are distinguished from older newly discovered editions | Pass | Phase 8 tests cover both a higher localized volume and a newly discovered lower-volume edition. |
| Meaningful changes are detected using stable identities | Pass | Comparisons use `workId + marketCode`, `editionId`, and provider/offer identity; timestamps, source order, and warning order are ignored. |
| Inaccessible history is non-fatal and observable | Pass | Dataset loading is optional; failures become `CHANGE_DATASET_UNAVAILABLE` warnings and current snapshots continue. |

## Implemented

- Previous snapshot loading from `previousDatasetId` with snapshot-record filtering.
- Supported change types: licensing, publisher, localized volume, official links, retail offers, price, stock, preorder, and release-date changes.
- Per-snapshot `changeDetection` summary with `hasChanges` and unique `changeTypes`.
- Always-written `CHANGE_REPORT`, including the disabled case.
- Runner and report integration with partial-result behavior when history is unavailable.

Phase 8 acceptance passes. Proceed to Phase 9.
