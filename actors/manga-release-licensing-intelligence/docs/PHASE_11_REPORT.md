# Phase 11 report — testing and benchmark

Checked 2026-08-05.

## Acceptance result

| Criterion | Result | Evidence |
| --- | --- | --- |
| Unit and integration coverage is present | Pass | Full suite passed 55 tests covering identity, editions, sources, retailers, release gaps, changes, deadlines, schemas, and quality invariants. |
| Default auto-test succeeds 10/10 | Pass | Ten exact default-input runs exited 0, each produced one matched snapshot and both key-value reports. |
| Auto-test runtime target is met | Pass | Maximum observed wall time was 8.05 seconds; all runs were below 120 seconds and the 240-second hard limit. |
| Canonical work matching ≥90% | Pass | 30/30 deterministic benchmark works matched at confidence ≥0.95. |
| Edition precision ≥90% | Pass | 10/10 compatible pairs matched and 0/5 incompatible pairs merged. |
| Dataset/output schema validity is 100% | Pass | `npm run validate:schema` passed input, dataset, and output schemas. |
| Optional source failure rate is non-fatal | Pass | Failure tests preserve snapshots; retail-enabled live run produced 2 snapshots, 1 US offer, 4 VN offers, and an explicit unmatched-offer warning. |
| Release-gap calculated records have complete provenance | Pass | Quality invariant and Phase 7 tests require original metadata plus localized edition evidence. |

## Deliverables

- `docs/BENCHMARK_REPORT.md`
- `docs/QUALITY_REPORT.md`
- `docs/COST_REPORT.md`
- `docs/AUTO_TEST_REPORT.md`
- `test/phase11-quality.test.mjs`

Phase 11 acceptance passes. Proceed to Phase 12.
