# Phase 3 Plan — Shared Schemas and Taxonomy Extraction

**Goal:** Make Steam use shared contract validators and taxonomy configuration
through compatibility adapters while preserving every published Steam output
field and schema.

**Files:**

- Create/modify: `packages/feedback-analysis-core/src/taxonomy/*` and contract exports
- Create: `actors/steam-game-feedback-analyzer/src/core/steam-taxonomy.js`
- Create: `actors/steam-game-feedback-analyzer/src/core/steam-contract-adapter.js`
- Modify: Steam analysis schema/config imports and package dependency wiring
- Test: `packages/feedback-analysis-core/test/steam-taxonomy.test.js` and Steam
  contract/regression tests
- Update: `docs/PHASE_3_REPORT.md`, `docs/SHARED_CORE_ARCHITECTURE.md`

**Verification:** Write tests for Steam taxonomy values, normalized adapter
provenance, and unchanged output contracts first; implement the smallest
compatibility mapping; run core tests, Steam tests, schemas, and the regression
comparison. No analysis engine or clustering behavior moves in this phase.
