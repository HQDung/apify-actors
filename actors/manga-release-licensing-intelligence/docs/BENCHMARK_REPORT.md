# Benchmark report

Checked 2026-08-05.

## Deterministic benchmark

The Phase 11 fixture set contains 30 works grouped as 10 popular ongoing, 5 completed, 5 Vietnamese-alias/edition, 5 omnibus or deluxe-oriented, and 5 difficult-title cases.

| Metric | Result | Target | Status |
| --- | ---: | ---: | --- |
| Canonical work cases | 30/30 matched at confidence ≥ 0.95 | ≥ 90% | Pass |
| Compatible edition pairs | 10/10 matched | ≥ 90% precision | Pass |
| Incompatible edition pairs | 0/5 incorrectly merged | ≥ 90% precision | Pass |
| Stock normalization invariants | 4/4 | 100% | Pass |
| Release-gap provenance invariant | 1/1 calculated case has ≥2 sources | 100% | Pass |

These are sanitized, deterministic quality fixtures; they are not a claim that every live source currently resolves all 30 works.

## Coverage

Existing phase tests cover US/VIZ, Vietnam/Kim Đồng, US+Vietnam snapshots, optional retailers, unavailable sources, ambiguous titles, title-not-found behavior, previous-dataset comparison, and empty source responses. The full Actor suite passed 55 tests after the Phase 11 additions.
