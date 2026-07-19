# Contextual Extraction Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent search-term-only venue classification and ambiguous age or price text from being emitted as confident structured facts.

**Architecture:** Add focused pure functions for evidence-based venue classification and context-aware age and price extraction. Preserve deterministic extraction, but return nullable fields when nearby labels do not establish meaning. Keep the existing pipeline and schemas intact.

**Tech Stack:** JavaScript, Vitest, Apify SDK, Playwright

---

### Task 1: Regression tests

**Files:**

- Modify: `test/unit/core.test.js`

- [ ] Add tests proving Flip Out is classified as `trampoline_park`, soft-play names retain `soft_play_center`, and birthday evidence adds `birthday_party_venue`.
- [ ] Add tests proving labeled child, adult, toddler, and family prices map to their corresponding fields while an unlabeled price remains null.
- [ ] Add tests proving a venue-wide age statement is extracted while a bare ticket-category range is ignored.
- [ ] Run `npm test -- test/unit/core.test.js` and confirm the new assertions fail for the current implementation.

### Task 2: Evidence-aware implementation

**Files:**

- Create: `src/classification/classify-venue-types.js`
- Modify: `src/enrichment/extract.js`
- Modify: `src/main.js`

- [ ] Implement venue classification from normalized name, selected search types, activities, and crawled website text.
- [ ] Implement labeled pricing extraction with ISO currencies and nullable semantic fields.
- [ ] Restrict age extraction to explicit suitability or age-context phrases.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Public documentation and benchmark record

**Files:**

- Modify: `.actor/input_schema.json`
- Modify: `.actor/output_schema.json`
- Modify: `sample-input.json`
- Modify: `README.md`
- Modify: `BENCHMARK_NOTES.md`
- Modify: `IMPLEMENTATION_HANDOFF.md`

- [ ] Document evidence-aware nullable output behavior without changing the input contract.
- [ ] Record build `0.1.4` as the pre-fix benchmark and require a post-fix cloud rerun.

### Task 4: Verification

- [ ] Run `npm run lint`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run format:check`.
- [ ] Run `apify validate-schema`.
- [ ] Do not publish automatically.
