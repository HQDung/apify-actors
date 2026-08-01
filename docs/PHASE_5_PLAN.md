# Phase 5 Plan — Shared Clustering and Aggregation

**Goal:** Extract duplicate clustering, report aggregation, and date-window
comparison into the core without allowing cross-product clusters or changing
Steam report totals.

**Core files:**

- Create `packages/feedback-analysis-core/src/clustering/cluster-id.js`
- Create `packages/feedback-analysis-core/src/clustering/cluster-feedback.js`
- Create `packages/feedback-analysis-core/src/aggregation/aggregate-feedback.js`
- Create `packages/feedback-analysis-core/src/aggregation/topic-stats.js`
- Create `packages/feedback-analysis-core/src/aggregation/compare-windows.js`
- Export only product-neutral cluster/aggregation functions from `src/index.js`

**Actor files:**

- Add Steam input/output mappers around the core functions.
- Preserve `GAME_<APP_ID>_REPORT`, `gameFeedbackReport`, Steam cluster IDs, and
  existing dataset records.
- Keep source-specific report names and KVS writes in the Steam Actor.

**Tests:**

- Write failing core tests for same-product/type clustering, cross-product
  separation, stable IDs, report counts, partial analysis failures, and bounded
  before/after windows.
- Run the core suite, Steam suite, schemas, regression comparison, and a local
  smoke before the phase report.
