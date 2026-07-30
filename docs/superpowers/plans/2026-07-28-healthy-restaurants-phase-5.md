# Healthy Restaurants Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract explicit dietary labels and restaurant-published nutrition from official HTML pages, then classify healthy positioning with explainable evidence.

**Architecture:** Keep taxonomy resolution, nutrition parsing, and healthy-positioning scoring in focused modules. Enrich Phase 4 menu items after HTML extraction; analyze the official homepage for restaurant-level claims and signals. Unsupported formats, estimated nutrition, allergen guarantees, and third-party sources remain out of scope.

**Tech Stack:** Node.js ES modules, Vitest, Apify Actor, existing deterministic HTML extraction.

---

### Task 1: Add red tests for Phase 5 intelligence

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/test/unit/phase5-intelligence.test.js`

- [ ] Test legend precedence: `V` remains unresolved without a legend, maps to vegetarian with `V = Vegetarian`, and `VG = Vegan` maps correctly.
- [ ] Test item tags retain normalized ID, original label, source type, URL, and confidence; one isolated tag does not become a restaurant-level specialty.
- [ ] Test published nutrition parses labelled, combined, and table formats while rejecting prices, ounces, percentages, and unlabelled estimates.
- [ ] Test healthy positioning requires strong evidence for `isHealthyFocused: true`, exposes signals/confidence, and does not classify one salad/vegan item or a search keyword alone as healthy-focused.

### Task 2: Implement dietary and nutrition extraction

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/src/dietary/extraction.js`
- Create: `actors/healthy-restaurants-menu-intelligence/src/nutrition/parsing.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/menu/extraction.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/menu/process-menu-page.js`

- [ ] Implement page-level legend parsing and explicit full-label/fallback alias resolution without assuming `V` means vegan.
- [ ] Enrich each extracted item from its name, section, description, and matching HTML block; attach deduplicated dietary tags and only official published nutrition.
- [ ] Parse calories, protein, carbohydrates, fat, sodium, serving size, combined labels, and simple header/value tables with non-negative validation.
- [ ] Merge dietary and nutrition evidence when Phase 4 deduplicates duplicate menu markup.

### Task 3: Implement classification and runtime integration

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/src/classification/healthy-positioning.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/website/crawl-restaurant-website.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/main.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/discovery/restaurants.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/schemas/validators.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/types/output.ts`

- [ ] Analyze official homepage claims, menu sections, dietary density, nutrition coverage, and keyword-only discovery signals.
- [ ] Score signals with the Phase 5 explainable thresholds and convert score to bounded confidence; preserve uncertain cases.
- [ ] Aggregate item/page dietary evidence at restaurant level, keeping explicit claims stronger than item density and not treating one item as a specialty.
- [ ] Ensure every emitted record remains schema-valid when menu crawling is disabled, missing, unsupported, or failed.

### Task 4: Update documentation, schemas, fixtures, and verification

**Files:**
- Modify: `actors/healthy-restaurants-menu-intelligence/README.md`
- Modify: `actors/healthy-restaurants-menu-intelligence/.actor/input_schema.json`
- Modify: `actors/healthy-restaurants-menu-intelligence/.actor/output_schema.json`
- Modify: `actors/healthy-restaurants-menu-intelligence/.actor/dataset_schema.json`
- Modify: `actors/healthy-restaurants-menu-intelligence/BENCHMARK_LONDON.md`
- Modify: `actors/healthy-restaurants-menu-intelligence/sample-input.json`

- [ ] Document Phase 5 fields, provenance, confidence, and explicit non-guarantees.
- [ ] Add deterministic fixtures for claims, legends, nutrition, and mixed/uncertain positioning.
- [ ] Run unit/integration tests, lint, format checks, `apify validate-schema`, `apify --help`, and a local `apify run` smoke test.

