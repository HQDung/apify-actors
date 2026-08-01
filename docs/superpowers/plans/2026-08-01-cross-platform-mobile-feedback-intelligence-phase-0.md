# Cross-Platform Mobile Feedback Intelligence Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit the existing shared core and source Actor prerequisites and produce evidence-backed blockers before comparison work begins.

**Architecture:** This phase is documentation-only. It reads the existing source-neutral contracts, source adapter, taxonomy, clustering, release-impact code, tests, and representative local output; it does not change production behavior.

**Tech Stack:** Node.js built-in test runner, Apify CLI, Markdown documentation.

---

### Task 1: Capture the prerequisite baseline

**Files:**
- Read: `packages/feedback-analysis-core/src/contracts/normalized-feedback.js`
- Read: `packages/feedback-analysis-core/src/clustering/cluster-feedback.js`
- Read: `packages/feedback-analysis-core/src/aggregation/compare-windows.js`
- Read: `actors/google-play-feedback-analyzer/src/core/google-play-contract-adapter.js`
- Read: `actors/google-play-feedback-analyzer/storage/datasets/default/*.json`

- [x] **Step 1: Run the shared-core suite**

Run: `node --test packages/feedback-analysis-core/test/*.test.js`

Expected: 10 tests pass and 0 fail.

- [x] **Step 2: Run the Google Actor suite**

Run: `node --test actors/google-play-feedback-analyzer/test/*.test.mjs actors/google-play-feedback-analyzer/tests/technical-spike-fixtures.test.mjs`

Expected: 27 tests pass and 0 fail.

- [x] **Step 3: Run repository regression and packaging checks**

Run: `node --test tests/contracts/*.test.js tests/regression/*.test.js` and `node --test test/core-packaging.test.js`.

Expected: 8 regression tests pass, 1 intentional network smoke is skipped, and 1 packaging test passes.

### Task 2: Document the audit and gaps

**Files:**
- Create: `docs/CROSS_PLATFORM_PREREQUISITE_AUDIT.md`
- Create: `docs/NORMALIZED_CONTRACT_GAPS.md`
- Create: `docs/CROSS_PLATFORM_IMPLEMENTATION_RISKS.md`

- [x] **Step 1: Record source and core readiness**

Document the available source Actors, the missing Apple App Store source, the exact test commands/results, and the representative Google output artifacts.

- [x] **Step 2: Compare the handoff contract with the implemented neutral contract**

Record field-by-field differences, including `source.platform` versus the handoff’s nested platform identity, nullable metadata, date/version coverage, developer replies, and analysis schema fields.

- [x] **Step 3: Record blockers and sequencing risks**

Mark Apple collection, Apple regression fixtures, cross-platform taxonomy compatibility, and analysis quality evidence as blockers or risks with concrete exit criteria.

- [x] **Step 4: Re-read the three reports for placeholder and contradiction checks**

Search: `rg -n "TBD|TODO|FIXME|<[^>]+>" docs/CROSS_PLATFORM_PREREQUISITE_AUDIT.md docs/NORMALIZED_CONTRACT_GAPS.md docs/CROSS_PLATFORM_IMPLEMENTATION_RISKS.md`

Expected: no placeholder matches; the reports consistently state that comparison work is blocked until the Apple source is implemented and validated.

### Task 3: Verify Actor schema tooling without changing Actor behavior

**Files:**
- Read: `actors/google-play-feedback-analyzer/.actor/input_schema.json`
- Read: `actors/google-play-feedback-analyzer/.actor/output_schema.json`

- [x] **Step 1: Confirm the Apify CLI is installed**

Run: `apify --help`

Expected: the CLI prints its command list and version information.

- [x] **Step 2: Validate the existing Google Actor schemas**

Run from `actors/google-play-feedback-analyzer`: `apify validate-schema`.

Expected: schema validation succeeds without modifying source files.

### Task 4: Publish the Phase 0 acceptance report

**Files:**
- Create: `docs/PHASE_0_CROSS_PLATFORM_REPORT.md`

- [x] **Step 1: Summarize evidence and acceptance status**

Include the test counts, schema result, source inventory, representative output paths, blockers, deferred work, and the next permitted phase.

- [x] **Step 2: Confirm the phase gate**

State that no cross-platform comparison implementation may begin until an Apple source Actor and its regression contract are available and green.
