# Phase 7 report — release-gap calculation

Checked 2026-08-05.

## Acceptance result

| Criterion | Result | Evidence |
| --- | --- | --- |
| No calculation across incompatible edition types | Pass | Omnibus, deluxe, box-set, special, and excluded-title tests return `calculated: false` |
| Every calculated gap has source provenance | Pass | Equal/trailing volume tests require metadata and localized source entries |
| Missing data produces null, not zero | Pass | Releasing work without original latest-volume evidence returns `volumeGap: null` |

## Implemented

- Comparable standard-volume selection with exclusions for omnibus, deluxe, box-set, special, art-book, spin-off, guide, and novel labels.
- Original volume count capture from metadata when the series is finished; ongoing counts are not treated as latest released volumes.
- Localized latest-release inference from market-specific editions.
- Gap confidence and provenance fields.
- Runner integration behind `includeReleaseGap`, disabled by default.

Phase 7 acceptance passes. Proceed to Phase 8.
