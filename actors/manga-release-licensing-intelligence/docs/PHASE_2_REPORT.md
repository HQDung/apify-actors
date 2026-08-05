# Phase 2 report — canonical metadata and work identity

Checked 2026-08-05.

## Acceptance result

| Criterion | Result | Evidence |
| --- | --- | --- |
| At least 90% correct work matching on benchmark set | Pass | 10/10 Phase 2 benchmark cases matched at confidence ≥ 0.95 |
| Low-confidence ambiguous matches are not auto-selected | Pass | Ambiguous candidate test remains `ambiguous`; single-title runner fails with `AMBIGUOUS_TITLE` |
| Manga and anime records are not confused | Pass | Open Library anime-only fixture is rejected; Kitsu is queried from its manga collection |
| English and Vietnamese aliases work | Pass | `Đảo Hải Tặc`, `Đôrêmon`, and `Thám Tử Lừng Danh Conan` benchmark cases match aliases |

## Implemented

- Unicode, punctuation, whitespace, multiplication-symbol, and Vietnamese-diacritic normalization.
- Canonical, native, and alias confidence scoring.
- Kitsu candidate ranking instead of first-result selection.
- Open Library anime/television guide rejection and conservative exact-match selection.
- Stable provider-qualified work IDs.
- Cross-provider fallback merge that preserves the strongest identity while filling missing authors, publisher fields, aliases, source IDs, and editions.
- Phase 2 identity and benchmark tests.

## Known limits

Kitsu does not reliably provide original country, original language, or ISBN in the sampled work response; missing values remain null. The matcher intentionally does not fuzzy-select unrelated candidates. Source policy remains permission-gated.

Phase 2 acceptance passes. Proceed to Phase 3.
