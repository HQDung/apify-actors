# Shared Core Migration Plan

Date: 2026-08-01

## Selected architecture

Create `packages/feedback-analysis-core` as a source-neutral package with a
small public API. Keep Steam and Google Play as independent Actor directories.
Pin an explicit core version in each Actor. During local development the root
repository can exercise the package directly; Actor build tooling must package
the core explicitly because the current Docker build context is Actor-local.

This is a versioned-package approach rather than an implicit monorepo workspace.
It preserves independent Apify deployment boundaries and limits the blast radius
of a core release. A repository-level package directory still allows shared
tests, fixtures, and review in one change set.

## Planned phase gates

| Phase | Gate | Required evidence |
| --- | --- | --- |
| 0 | Audit | This audit, boundaries, migration plan, and baseline fixture |
| 1 | Steam safety | Contract/fixture tests, comparison script, regression report |
| 2 | Core skeleton | Independent build/test with no Actor imports |
| 3 | Contracts | Steam imports shared schemas/taxonomy; regression green |
| 4 | Analysis | Provider/validator/fallback extraction; raw reviews survive failures |
| 5 | Clustering/reporting | Product partition tests and Steam report comparison |
| 6 | Core v1 | Core version pinned, rollback tag/checkpoint, Steam smoke |
| 7 | Google Play spike | Three-app raw fixtures and collection recommendation |
| 8 | Raw Actor | Multi-app raw collection, schema validation, cloud/local smoke |
| 9 | Normalization | Google Play contract/taxonomy tests and provenance checks |
| 10 | Analysis | English/Vietnamese analysis and cost/error behavior |
| 11 | Reports | Per-app clusters/reports, KVS output, cross-app protection |
| 12 | Release Impact | Before/after windows, warnings, non-causal wording |
| 13 | Benchmark | Quality/cost/runtime reports with disclosed limitations |
| 14 | Store readiness | Input/output/dataset schemas and views validated |
| 15 | Documentation | README, samples, benchmark notes, roadmap complete |
| 16 | Publish gate | Full matrix, no blocking acceptance failures |
| 17 | Publication | Only explicit operator publication, then post-publish report |

Each phase ends with: implementation/documentation changes, phase-specific
tests, an acceptance report, a committed checkpoint, deferred items, and a
written plan for the next phase. No phase may silently deploy or change pricing.

## Extraction order

1. Add Steam regression protection before moving behavior.
2. Add package contracts and taxonomy configuration without changing Steam.
3. Move analysis behind injected provider/taxonomy/logger interfaces.
4. Move clustering and aggregation behind product-neutral contracts.
5. Keep Steam collection and output mapping in the Steam Actor.
6. Validate core v1 through Steam before starting Google Play.
7. Build Google Play raw collection first; add analysis only after collection is
   stable and fixtures exist.

## Rollback plan

- Keep Steam output mapping and public field names unchanged until comparison
  tests pass.
- Tag or commit the pre-core Steam baseline before Phase 2 migration.
- Pin the Steam Actor to a known core version; do not consume an unreviewed
  moving package reference.
- If a migration gate fails, restore the previous Actor import path and leave the
  new core package isolated; do not modify source fixtures to hide differences.
- Do not push or publish the Steam Actor during a failing gate.
- For Google Play, disable analysis/clustering independently if the raw adapter
  remains healthy; raw collection must remain recoverable after partial failures.

## Phase 1 acceptance criteria

Phase 1 is accepted only when:

- Normalized Steam fixtures cover English, Vietnamese, bug, feature, positive,
  non-actionable, multiple-game, and analysis-failure cases.
- Structured comparison checks counts, required fields, taxonomy IDs, report
  totals, and cluster-to-review links while ignoring nondeterministic timestamps
  and generated summaries intentionally.
- A bounded local smoke command is documented and fixture tests do not require
  live Steam access.
- The Steam baseline test command is a single repeatable command and passes.
- The comparison output is saved in `docs/STEAM_REGRESSION_BASELINE.md`.

## Deferred until later phases

- Shared package implementation and imports (Phase 2+).
- Google Play HTTP research and fixtures (Phase 7).
- AI/provider-backed analysis (Phase 4 for Steam, Phase 10 for Google Play).
- Store publication, pricing, and cloud deployment changes.
