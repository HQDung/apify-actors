# Xero & QuickBooks Accounting Firm Leads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a global Apify Actor that normalizes public Xero and QuickBooks advisor-directory records into deduplicated accounting-firm leads.

**Architecture:** Use the repository's JavaScript runtime and TypeScript contract-file convention. Source adapters produce source records; independent modules validate input, normalize records, merge firms, score completeness, and push schema-valid leads. Live adapters remain gated on verified public directory behavior, and website enrichment begins only after one live adapter is reliable.

**Tech Stack:** Node.js ESM, Apify SDK 3.7, Playwright 1.60, Vitest 4, ESLint 9.

---

### Task 1: Phase 0 and synchronized Actor scaffold

**Files:** Create `actors/xero-quickbooks-accounting-firm-leads/{README.md,BENCHMARK_NOTES.md,sample-input.json,package.json,Dockerfile,eslint.config.mjs,check-playwright-version.mjs,.actor/*.json}`.

- [x] Record the existing commands and reuse the Kids Activities package/toolchain without adding dependencies.
- [x] Set `.actor/actor.json` `meta.generatedBy` to `Codex with GPT-5`.
- [x] Define only the handoff's seven public inputs and matching sample input.
- [x] Define one dataset item and an Overview view with flat convenience fields.
- [x] Document the same contract in README and benchmark notes.

### Task 2: RED — Phase 1 behavior tests

**Files:** Create `test/unit/core.test.js` and public source fixtures under `test/fixtures/`.

- [x] Test trimming/deduplicating 1–20 locations, source enums, and `maxResults` bounds.
- [x] Test URL/domain/phone/email normalization and language-neutral taxonomy mappings.
- [x] Test conservative firm keys and cross-source merge provenance.
- [x] Test the deterministic completeness score.
- [x] Test a mocked Xero + QuickBooks pipeline, partial source failure, and the final cap.
- [x] Run `npm test` and confirm failures are caused by missing Phase 1 modules.

### Task 3: GREEN — Phase 1 modules and mocked pipeline

**Files:** Create focused modules under `src/{models,sources,normalization,deduplication,scoring,schemas,pipeline}` plus `src/main.js`.

- [x] Implement input validation and stable taxonomy constants.
- [x] Implement source adapter contracts and normalized lead/source-record contracts.
- [x] Implement URL/domain/phone/email normalization.
- [x] Implement conservative firm keys, merge unions, provenance preservation, and score calculation.
- [x] Implement dependency-injected pipeline orchestration so fixtures require no network.
- [x] Validate each lead before `Actor.pushData()` and write the run summary to `OUTPUT`.
- [x] Run focused and full tests until green, then lint and syntax build.

### Task 4: Live-source discovery gate

**Files:** Add only verified fixtures and source-specific parser/search modules.

- [x] Inspect the current public Xero search flow for UK/Australia/Singapore coverage.
- [x] Inspect the current public QuickBooks ProAdvisor flow for US coverage.
- [ ] Prefer public HTML/embedded JSON or documented public endpoints; do not use login-protected/private APIs or bypass controls.
- [x] If stable public responses are available, save minimal public fixtures, write failing parser tests, then implement each parser.
- [x] If access is blocked or contracts are unstable, stop live implementation and document the exact blocker; keep Phase 1 runnable with explicit `not_implemented` source failures.

### Task 5: Verification checkpoint

**Files:** Update README, schemas, sample input, and benchmark notes together for any contract change.

- [ ] Run `npm run lint`, `npm test`, and `npm run build` in the Actor.
- [ ] Run root static validation and `apify validate-schema`.
- [ ] Run `apify run --purge` using a mocked/offline fixture mode only if exposed as an internal non-public test hook; otherwise verify the production input fails clearly until a live adapter exists.
- [ ] Inspect dataset items and `OUTPUT` locally.
- [ ] Do not benchmark, push, publish, or change pricing.
