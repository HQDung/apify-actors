# Phase 1 Acceptance Report — Steam Regression Safety

Date: 2026-08-01

## Result

Accepted. Steam behavior now has deterministic contract and fixture coverage
before shared-core extraction. The new comparison script checks compatibility
without treating generated timestamps or provider summaries as stable values.

## Changes

- Added `npm run test:steam-regression`.
- Added normalization, analysis, failure-isolation, fixture, and opt-in live
  smoke tests under `tests/contracts/` and `tests/regression/`.
- Added `scripts/compare-steam-output.mjs` for structured baseline comparison.
- Added `docs/STEAM_REGRESSION_BASELINE.md` with commands and comparison policy.

## Verification

| Check | Result |
| --- | --- |
| Deterministic regression suite | 8 passed, 1 opt-in smoke skipped |
| Public live regression smoke | 1 passed, 5-review bounded run |
| Baseline vs current storage comparison | valid, 0 errors |
| Captured fixture contract | 10 reviews, 1 cluster, report totals match |
| Steam Actor baseline suite | 47 passed across 14 files |

## Deferred items

The shared package has not been created and Steam production imports have not
changed. Nondeterministic AI summary comparison remains intentionally relaxed;
semantic quality benchmarking is deferred to Phase 13.

## Next phase plan

Phase 2 will create `packages/feedback-analysis-core` with source-neutral
contracts, taxonomy configuration, isolated tests, and public exports. It will
not change Steam imports or output behavior; the package must build without the
Apify runtime.
