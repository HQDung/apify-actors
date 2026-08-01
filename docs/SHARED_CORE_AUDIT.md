# Shared Feedback Analysis Core Audit

Date: 2026-08-01

## Scope

This audit covers `actors/steam-game-feedback-analyzer` before any production
refactor. The current Actor is a single JavaScript package using Apify SDK
`3.7.0` (installed `3.7.2`) and Vitest. It has no shared package or workspace
dependency today.

## Current data flow

```text
Actor.getInput()
  -> input/normalize-input.js
  -> steam/steam-client.js
       -> getGameDetails()
       -> fetchReviews()
  -> steam/normalize-review.js
  -> analysis/analyze-review.js
       -> analysis/fallback-analysis.js
       -> analysis/analysis-schema.js
  -> clustering/cluster-reviews.js
  -> Actor.pushData(review records and clusters)
  -> aggregation/aggregate-game-report.js
  -> Actor.setValue(GAME_<APP_ID>_REPORT)
  -> Actor.setValue(RUN_STATS)
  -> Actor.exit()
```

`patchImpact` reuses `runtime/process-game.js` twice with bounded date windows,
then calls `aggregation/patch-impact.js`. `rawReviews` skips analysis and
clustering but still emits normalized records.

## Module classification

| Module | Classification | Reason |
| --- | --- | --- |
| `src/steam/steam-client.js` | Steam adapter | Steam endpoints, cursors, filters, retry headers |
| `src/steam/normalize-review.js` | Steam adapter | Steam response fields and author metadata |
| `src/input/extract-app-ids.js` | Steam adapter | Steam URL and app-ID rules |
| `src/input/normalize-input.js` | Mixed | Actor validation plus Steam-specific settings |
| `src/config/defaults.js` | Mixed | Generic analysis settings plus Steam input defaults |
| `src/config/taxonomy.js` | Mixed | Shared-like feedback concepts combined with Steam topics |
| `src/analysis/fallback-analysis.js` | Mixed | Analysis heuristics are reusable, but topic/type rules include Steam terms |
| `src/analysis/analyze-review.js` | Candidate shared | Provider boundary is absent today; wrapper is source-neutral |
| `src/analysis/analysis-schema.js` | Candidate shared | Validation shape is reusable, but taxonomy is imported from Steam config |
| `src/clustering/cluster-id.js` | Candidate shared | Slugging and stable IDs are reusable after replacing `appId` assumptions |
| `src/clustering/cluster-reviews.js` | Mixed | Similarity is reusable; `record.game.steamAppId` is source-specific |
| `src/aggregation/calculate-topic-stats.js` | Candidate shared | Topic counting is source-neutral |
| `src/aggregation/aggregate-game-report.js` | Mixed | Statistics are reusable; report and `game` fields are Steam-specific |
| `src/aggregation/patch-impact.js` | Candidate shared | Date-window comparison is reusable after neutralizing report names |
| `src/runtime/process-game.js` | Mixed | Orchestrates adapter, analysis, clustering, and Apify-independent callbacks |
| `src/runtime/process-patch-impact.js` | Mixed | Generic orchestration with Steam patch naming and input shape |
| `src/runtime/run-statistics.js` | Candidate shared | Counter container is source-neutral; names are currently Steam/game-oriented |
| `src/output/save-game-report.js` | Actor boundary | Key-value-store key naming is Actor-specific |
| `src/main.js` | Steam Actor runtime | Actor lifecycle, dataset, KVS, logging, Steam loop |

## Runtime and environment dependencies

Only `src/main.js` imports `apify` directly. It uses `Actor.init`, `getInput`,
`pushData`, `setValue`, `exit`, and `log`. Other modules receive `pushData` and
`setValue` callbacks and can therefore be tested without an Actor runtime.

The SDK also consumes Apify environment variables for local/cloud storage and
run lifecycle internally. No module reads API keys, model secrets, or custom
environment variables. `proxyConfiguration` is accepted and preserved by input
normalization but is not currently applied by the Steam client.

The Dockerfile installs only the Actor package dependencies from the Actor
directory. This is the main constraint on introducing a sibling shared package
without changing the build/deployment boundary.

## Existing behavior captured

Baseline checks on 2026-08-01:

- `npm test`: 14 files, 47 tests passed.
- `npm run build`: passed (`node --check src/main.js`).
- `npm run lint`: passed.
- `npm run validate:schema`: input, dataset, and output schemas passed.
- `npm run validate:release`: valid, no errors.
- Bounded local public-data smoke: 1 app, 10 reviews, 10 analyses, 1 cluster,
  0 errors, 1 report, runtime `0.866s`.

The baseline dataset and key-value outputs are stored under
`tests/fixtures/steam-before-refactor/`. The fixture contains 10 review
records, one cluster record, the input, run statistics, and the per-game report.

## Extraction dependency graph

```text
Steam input extraction ───────┐
Steam HTTP client ────────────┼─> Steam normalization ──> generic processing
Steam app metadata ───────────┘                              │
                                                            ├─> analysis schema
                                                            ├─> analysis engine
                                                            ├─> clustering
                                                            └─> aggregation
                                                                 │
                                             Steam output mapper/KVS/runtime ─> Actor
```

The first safe seam is a normalized feedback contract between
`steam/normalize-review.js` and the analysis engine. The second seam is a
platform-neutral analysis/cluster/report contract before Steam output mapping.

## Findings and risks

1. Current tests are unit-heavy and do not compare a complete pre-refactor
   dataset/report contract.
2. Taxonomy, schema validation, fallback heuristics, and Steam-specific terms
   are coupled in three analysis files.
3. Cluster code assumes `game.steamAppId`; extracting it without a product key
   would permit cross-product clusters.
4. Report generation assumes Steam's `game` shape and key names.
5. The current public Actor output includes source-specific `author` fields;
   these must remain outside normalized shared contracts.
6. The Dockerfile's Actor-local build context favors a versioned package/tarball
   or an explicit build packaging step over an implicit workspace import.
7. Live smoke tests depend on public Steam availability. Fixture tests must be
   the deterministic migration gate.

## Phase 0 decision

Use a source-neutral package under `packages/feedback-analysis-core` as the
canonical implementation, with explicit public exports and a pinned version.
Because current Actor builds are directory-local, the migration must include an
explicit package packaging/install step for Actor builds; imports must not rely
on undeclared sibling paths inside the Apify Docker build.
