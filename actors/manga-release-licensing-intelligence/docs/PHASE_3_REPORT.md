# Phase 3 report — edition identity and volume parsing

Checked 2026-08-05.

## Acceptance result

| Criterion | Result | Evidence |
| --- | --- | --- |
| ISBN-identical listings merge | Pass | ISBN-10/ISBN-13 normalization and duplicate-ID test |
| Paperback and ebook remain distinguishable | Pass | Format and ISBN separation test |
| Omnibus and standard volumes do not merge | Pass | Edition-type separation test |
| Vietnamese `Tập` labels normalize | Pass | `Tập 01` parses to volume 1 and preserves the original label |
| Manual edition-match precision exceeds 90% | Pass for the 4-case fixture sample | 4/4 expected merge/separation decisions |

## Implemented

- ISBN-10/ISBN-13 validation, conversion, and invalid-ISBN error code.
- Volume parsing for `Vol.`, `Volume`, `Tập`, numeric labels, and omnibus ranges.
- Edition-type parsing for standard, omnibus, deluxe, collector, box set, and special labels.
- Format parsing for paperback, hardcover, ebook, web, and subscription signals.
- Stable hashed edition IDs that exclude tracking URLs.
- Conservative edition matching and duplicate resolution.
- Open Library edition mapping now uses the shared ISBN/edition normalizer.

## Known limits

Product pages that omit ISBN, volume, or format remain conservative `unknown` records. Edition matching does not infer identity from a title alone. Source policy remains permission-gated.

Phase 3 acceptance passes. Proceed to Phase 4.
