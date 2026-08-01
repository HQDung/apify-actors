# Phase 6 Plan — Complete Steam Migration and Release Core v1

**Goal:** Finish the Steam refactor, make the shared core deployable from the
existing Actor-local build context, and release a pinned core v1 checkpoint.

**Tasks:**

- Add a deterministic `scripts/package-feedback-core.mjs` artifact step that
  packs the canonical package into an Actor-local vendor location without
  changing source behavior.
- Add a pinned Actor dependency/build path and verify a clean Docker-style
  install can resolve the core without the repository sibling directory.
- Remove obsolete Steam clustering/aggregation/analysis duplicates only after
  compatibility wrappers and regression comparison pass.
- Add core package changelog/version metadata and rollback instructions.
- Update `docs/STEAM_MIGRATION_REPORT.md` and `CHANGELOG.md` with measured tests,
  runtime, cost, and known packaging limitations.

**Verification:** Run core tests, Steam tests, lint, build, schemas, release
validation, regression comparison, local Actor smoke, and a clean packaged
runtime smoke. No `apify push`, publication, or pricing change is authorized by
this phase.
