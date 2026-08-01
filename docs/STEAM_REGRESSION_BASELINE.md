# Steam Regression Baseline

Date: 2026-08-01

## Commands

Run deterministic contract and fixture checks from the repository root:

```bash
npm run test:steam-regression
```

Compare two captured Actor snapshots. Each snapshot may be either the committed
fixture root (`dataset/` and `key-value-store/`) or an Apify local Actor storage
root (`storage/datasets/default/` and `storage/key_value_stores/default/`):

```bash
node scripts/compare-steam-output.mjs \
  tests/fixtures/steam-before-refactor \
  actors/steam-game-feedback-analyzer
```

Run the bounded live public-data test only when network access is intentional:

```bash
RUN_STEAM_LIVE_SMOKE=1 node --test tests/regression/steam-live-smoke.test.js
```

## Captured baseline

The committed baseline was collected from Steam app `730` with English reviews,
`maxReviewsPerGame: 10`, feedback analysis enabled, and aggregation enabled.
It contains 10 review records, 1 feedback cluster, 10 successful analyses, 0
analysis errors, and a `GAME_730_REPORT` key-value report.

## Comparison policy

The comparison script enforces:

- record-type counts;
- review ID sets and stable source/product fields;
- analysis status, feedback types, topics, sentiment, severity, and actionability;
- cluster ID sets, type, counts, review links, and product partitioning;
- report keys, product identity, and review/actionability totals.

It intentionally does not compare scrape timestamps, generated timestamps,
provider metadata, or generated summaries byte-for-byte. A summary is checked as
part of the record contract by the Actor's unit tests; wording may vary when a
provider-backed analyzer is introduced.

## Phase 1 acceptance status

The regression suite covers normalization, English/Vietnamese analysis fixtures,
bug/feature/non-actionable cases, analysis failure preservation, cluster links,
aggregate totals, multiple-game partitioning through existing Steam tests, and a
bounded live smoke test that is opt-in.
