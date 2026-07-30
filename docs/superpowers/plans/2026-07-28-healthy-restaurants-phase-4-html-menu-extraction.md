# Phase 4 HTML Menu Extraction Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with test-first checkpoints.

**Goal:** Extract deterministic, schema-valid menu sections, items, descriptions, and prices from supported HTML menu candidates discovered in Phase 3.

**Architecture:** Keep parsing pure and dependency-free in a focused menu extraction module. A bounded page processor will reuse Phase 3 URL canonicalization, redirect handling, and timeout behavior. The Actor will enrich each restaurant independently, preserving unsupported candidates and page-level failures while applying configured page/item limits.

**Tech Stack:** JavaScript ES modules, Vitest, Apify SDK, existing normalization and concurrency helpers.

---

### Task 1: Define Phase 4 output provenance and fixtures

**Files:**
- Modify: `actors/healthy-restaurants-menu-intelligence/src/types/output.ts`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/schemas/validators.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/discovery/restaurants.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/test/unit/validators.test.js`

- [ ] Add `extractionMethods` to menu items and menu output, initialize it in Phase 2 records, and extend validation.
- [ ] Add fixture expectations for empty provenance arrays and extracted item provenance.
- [ ] Run the validator unit tests and confirm the new contract fails before implementation.

### Task 2: Build price and item normalization tests first

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/src/menu/extraction.js`
- Create: `actors/healthy-restaurants-menu-intelligence/test/unit/menu-extraction.test.js`

- [ ] Add failing tests for fixed, from, range, multiple/size, GBP inference, missing prices, text normalization, candidate rejection, and section inheritance.
- [ ] Implement minimal deterministic helpers returning `{ amount, currency, formattedOriginal, priceType }` or `null`.
- [ ] Add candidate validation that rejects navigation/footer/opening-hours/address/promotion/cookie/price-only/heading blocks.
- [ ] Run the focused unit tests and refactor only after green.

### Task 3: Add layered HTML extraction and deduplication

**Files:**
- Modify: `actors/healthy-restaurants-menu-intelligence/src/menu/extraction.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/test/unit/menu-extraction.test.js`
- Create: `actors/healthy-restaurants-menu-intelligence/test/fixtures/menus/*.html`

- [ ] Add fixture-driven tests for standard cards, lists, section inheritance, no prices, JSON-LD, embedded JSON, duplicate mobile/desktop markup, promotional pages, empty pages, and malformed structured data.
- [ ] Implement extraction order JSON-LD, safe embedded JSON, repeated DOM-like markup, and cautious text blocks.
- [ ] Attach `json_ld`, `embedded_json`, `dom_repeated_structure`, or `generic_text_parser` provenance.
- [ ] Deduplicate by normalized section/name/price signals while retaining more complete descriptions and separating material section/variant/price differences.
- [ ] Enforce maximum item limits in the pure extraction API.

### Task 4: Add bounded menu page processing

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/src/menu/process-menu-page.js`
- Create: `actors/healthy-restaurants-menu-intelligence/test/unit/process-menu-page.test.js`

- [ ] Add failing tests for HTML-only processing, redirect final URLs, unsupported candidates, empty extraction, malformed pages, and isolated page failures.
- [ ] Implement one-page fetch/body timeout handling using Phase 3 helpers and return structured page results with warnings/errors.
- [ ] Keep non-HTML candidates unchanged and never parse PDF/image content.

### Task 5: Integrate restaurant-level extraction and logging

**Files:**
- Modify: `actors/healthy-restaurants-menu-intelligence/src/main.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/test/integration/london-websites.test.js`

- [ ] Add injected-fetch London fixtures for representative HTML menu pages and verify extracted records.
- [ ] Process only HTML candidates, cap pages and items, merge item provenance, isolate failures, and set the required menu statuses.
- [ ] Add aggregate logs for pages crawled, raw items, deduplicated items, empty menus, and failures.

### Task 6: Update schemas, docs, and verification

**Files:**
- Modify: `actors/healthy-restaurants-menu-intelligence/.actor/input_schema.json`
- Modify: `actors/healthy-restaurants-menu-intelligence/.actor/output_schema.json`
- Modify: `actors/healthy-restaurants-menu-intelligence/.actor/dataset_schema.json`
- Modify: `actors/healthy-restaurants-menu-intelligence/README.md`
- Modify: `actors/healthy-restaurants-menu-intelligence/BENCHMARK_LONDON.md`

- [ ] Document Phase 4 extraction and provenance without claiming PDF/OCR/dietary/nutrition support.
- [ ] Run lint, build, format check, all tests, schema validation, and the local London smoke test.
- [ ] Inspect representative local dataset records and report limitations.
