# Phase 10 report — dataset, output, and UI readiness

Checked 2026-08-05.

## Acceptance result

| Criterion | Result | Evidence |
| --- | --- | --- |
| Input UI opens with runnable values | Pass | Input schema defaults to `titleLookup`, `One Piece`, `US-en`, no proxy, no secret, and retail collection disabled. |
| Clicking Start without edits succeeds | Pass | `apify run --purge` exited 0, produced one matched snapshot, and completed in 5 seconds. |
| Output tab displays the overview table | Pass | Dataset schema validates an Overview view with flattened title, market, license, release, availability, offer, and observed-time fields. |
| Dataset validation passes | Pass | `npm run validate:schema` validated input, dataset, and output schemas. |
| Output schema validation passes | Pass | Same schema validation run passed; output properties retain `type`, `title`, and Console `template` links. |
| Run summary and change report links are available | Pass | Output schema exposes `runSummary` and `changeReport` key-value-store templates; local run wrote both records. |
| Nested JSON arrays and CSV-friendly fields remain usable | Pass | Snapshot sample includes valid nested `editions`, `offers`, `sources`, and flattened summary fields such as `marketCode`, `latestLocalizedVolume`, and `offersCollected`. |

## Implemented

- Added a real default output sample from the validated live default path.
- Clarified runnable versus reserved input modes in the input schema and README.
- Added a Detected changes dataset view alongside Overview, Licensing, Availability, and Provenance.
- Added schema/UI contract tests and refreshed README, benchmark notes, changelog, and auto-test documentation together.
- Preserved no-auto-publish and no-auto-pricing behavior.

Phase 10 acceptance passes. Proceed to Phase 11.
