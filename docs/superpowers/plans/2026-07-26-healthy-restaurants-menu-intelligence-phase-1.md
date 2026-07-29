# Healthy Restaurants Menu Intelligence — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the validated foundation for a new Healthy Restaurants & Menu Intelligence Actor without implementing discovery, crawling, or menu extraction.

**Architecture:** Create a JavaScript Actor that follows the repository’s existing Playwright Actor convention, with standalone TypeScript contract files documenting public input and output. Keep taxonomy and validation pure so later discovery and extraction phases can use them without browser dependencies. Schemas describe the Phase 1 public contract and the dataset schema exposes only top-level columns.

**Tech Stack:** Node.js ESM, Apify SDK, JSON schemas, Vitest, ESLint, Prettier.

---

## File structure

- `actors/healthy-restaurants-menu-intelligence/.actor/actor.json`: Actor metadata and schema references.
- `actors/healthy-restaurants-menu-intelligence/.actor/input_schema.json`: six-field Version 1 input contract.
- `actors/healthy-restaurants-menu-intelligence/.actor/output_schema.json`: dataset output store declaration.
- `actors/healthy-restaurants-menu-intelligence/.actor/dataset_schema.json`: default dataset table view.
- `actors/healthy-restaurants-menu-intelligence/src/types/input.ts`: TypeScript input contract.
- `actors/healthy-restaurants-menu-intelligence/src/types/output.ts`: TypeScript restaurant-record contract.
- `actors/healthy-restaurants-menu-intelligence/src/taxonomy/dietary-tags.js`: supported language-independent dietary IDs and explicit-label normalization.
- `actors/healthy-restaurants-menu-intelligence/src/schemas/validators.js`: input and record validators shared by later phases.
- `actors/healthy-restaurants-menu-intelligence/src/main.js`: Phase 1 safe entry point that validates input and exits without emitting records.
- `actors/healthy-restaurants-menu-intelligence/test/unit/validators.test.js`: validation and taxonomy regression coverage.
- `actors/healthy-restaurants-menu-intelligence/{package.json,Dockerfile,eslint.config.mjs,check-playwright-version.mjs}`: copied runtime tooling matching the Kids Activities Actor.
- `actors/healthy-restaurants-menu-intelligence/{README.md,sample-input.json,BENCHMARK_LONDON.md}`: honest Phase 1 documentation and test input.

### Task 1: Scaffold the Actor runtime

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/package.json`
- Create: `actors/healthy-restaurants-menu-intelligence/Dockerfile`
- Create: `actors/healthy-restaurants-menu-intelligence/check-playwright-version.mjs`
- Create: `actors/healthy-restaurants-menu-intelligence/eslint.config.mjs`
- Create: `actors/healthy-restaurants-menu-intelligence/.actor/actor.json`

- [ ] **Step 1: Copy the known-compatible local runtime configuration**

Copy the files from `actors/kids-activities-playground-intelligence`, retaining pinned Playwright `1.60.0`, Apify `^3.7.0`, Vitest, ESLint, and Prettier. Set the package and Actor names to `healthy-restaurants-menu-intelligence`, use title `Healthy Restaurants & Menu Intelligence`, version `0.1.0`/`0.1`, and set `meta.generatedBy` to `Codex with GPT-5`.

- [ ] **Step 2: Verify the runtime metadata is syntactically valid**

Run: `node --check actors/healthy-restaurants-menu-intelligence/check-playwright-version.mjs`

Expected: exits `0`.

- [ ] **Step 3: Commit the scaffold**

```bash
git add actors/healthy-restaurants-menu-intelligence/package.json actors/healthy-restaurants-menu-intelligence/Dockerfile actors/healthy-restaurants-menu-intelligence/check-playwright-version.mjs actors/healthy-restaurants-menu-intelligence/eslint.config.mjs actors/healthy-restaurants-menu-intelligence/.actor/actor.json
git commit -m "feat: scaffold healthy restaurants actor"
```

### Task 2: Define contracts and dietary taxonomy

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/src/types/input.ts`
- Create: `actors/healthy-restaurants-menu-intelligence/src/types/output.ts`
- Create: `actors/healthy-restaurants-menu-intelligence/src/taxonomy/dietary-tags.js`
- Test: `actors/healthy-restaurants-menu-intelligence/test/unit/validators.test.js`

- [ ] **Step 1: Write failing taxonomy assertions**

```js
import { dietaryTagForLabel, dietaryTagIds } from "../../src/taxonomy/dietary-tags.js";

expect(dietaryTagIds).toContain("high_protein");
expect(dietaryTagForLabel("GF")).toBe("gluten_free");
expect(dietaryTagForLabel("unverified promise")).toBeNull();
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run test/unit/validators.test.js`

Expected: FAIL because the taxonomy module does not exist.

- [ ] **Step 3: Add the explicit-label taxonomy**

Export the 15 handoff IDs: `vegan`, `vegetarian`, `gluten_free`, `dairy_free`, `nut_free`, `halal`, `kosher`, `organic`, `high_protein`, `low_carb`, `keto`, `low_calorie`, `plant_based`, `sugar_free`, and `no_added_sugar`. Map only explicit English labels and abbreviations such as `GF`; return `null` for unknown text. Do not represent allergen safety or medical suitability.

Define `HealthyRestaurantsInput` with exactly `location`, `keywords`, `maxRestaurants`, `includeMenu`, `normalizedOutputLanguage`, `preserveOriginalText`, `maxMenuPagesPerRestaurant`, and `maxMenuItemsPerRestaurant`. Define restaurant output types including menu status, provenance-bearing dietary tags, and nutrition whose source type is exactly `restaurant_published`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --run test/unit/validators.test.js`

Expected: PASS.

- [ ] **Step 5: Commit contracts and taxonomy**

```bash
git add actors/healthy-restaurants-menu-intelligence/src/types actors/healthy-restaurants-menu-intelligence/src/taxonomy actors/healthy-restaurants-menu-intelligence/test/unit/validators.test.js
git commit -m "feat: add restaurant contracts and dietary taxonomy"
```

### Task 3: Implement input and output validation

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/src/schemas/validators.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/test/unit/validators.test.js`

- [ ] **Step 1: Write failing contract assertions**

```js
import { isRestaurantOutput, validateInput } from "../../src/schemas/validators.js";

expect(validateInput({ location: " London, United Kingdom " }).location).toBe("London, United Kingdom");
expect(() => validateInput({ location: "", maxRestaurants: 1 })).toThrow("location");
expect(() => validateInput({ location: "London", maxRestaurants: 101 })).toThrow("maxRestaurants");
expect(isRestaurantOutput(validRecord)).toBe(true);
expect(isRestaurantOutput({ ...validRecord, menu: { status: "made_up" } })).toBe(false);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run test/unit/validators.test.js`

Expected: FAIL because the validator module does not exist.

- [ ] **Step 3: Add deterministic validators**

`validateInput` must trim a required location; default the five healthy search keywords from the handoff; bound `maxRestaurants` to 1–100, `maxMenuPagesPerRestaurant` to 1–10, and `maxMenuItemsPerRestaurant` to 1–1000; accept only `normalizedOutputLanguage: "en"`; and default both booleans to `true`.

`isRestaurantOutput` must reject undefined values, require an `actorOutputSchemaVersion` of `1`, an array of `warnings` and `errors`, language-independent dietary IDs, a valid menu status, `menu.itemsFound === menu.items.length`, and nutrition objects that use only `restaurant_published`. It must not require menu extraction to have occurred.

- [ ] **Step 4: Run tests and lint**

Run: `npm test -- --run test/unit/validators.test.js && npm run lint`

Expected: both commands exit `0`.

- [ ] **Step 5: Commit validation**

```bash
git add actors/healthy-restaurants-menu-intelligence/src/schemas/validators.js actors/healthy-restaurants-menu-intelligence/test/unit/validators.test.js
git commit -m "feat: validate healthy restaurant contracts"
```

### Task 4: Add Apify schemas and Phase 1 entry point

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/.actor/input_schema.json`
- Create: `actors/healthy-restaurants-menu-intelligence/.actor/output_schema.json`
- Create: `actors/healthy-restaurants-menu-intelligence/.actor/dataset_schema.json`
- Create: `actors/healthy-restaurants-menu-intelligence/src/main.js`

- [ ] **Step 1: Add the public input schema**

Use `schemaVersion: 1`; make `location` required with default/prefill `London, United Kingdom`; use a beginner-friendly string-list editor for keywords; and match every validator default and range exactly. Do not expose proxy, crawler, concurrency, social, multi-location, PDF, OCR, or nutrition-estimation settings.

- [ ] **Step 2: Add output and dataset schemas**

Declare a dataset output template and a table view exposing `restaurantName`, `location`, `contact`, `healthyPositioning`, `dietaryOptions`, `menu`, and `scrapedAt`. The schemas must describe one restaurant record with nested menu items, not one record per item.

- [ ] **Step 3: Add a safe Phase 1 entry point**

Initialize the Actor, call `validateInput((await Actor.getInput()) ?? {})`, log that discovery is not yet implemented, and exit successfully. Do not push placeholder records.

- [ ] **Step 4: Validate schemas and entry-point syntax**

Run: `cd actors/healthy-restaurants-menu-intelligence && apify validate-schema && node --check src/main.js`

Expected: both commands exit `0`.

- [ ] **Step 5: Commit Actor interfaces**

```bash
git add actors/healthy-restaurants-menu-intelligence/.actor actors/healthy-restaurants-menu-intelligence/src/main.js
git commit -m "feat: add healthy restaurants actor schemas"
```

### Task 5: Document and locally verify the Phase 1 boundary

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/README.md`
- Create: `actors/healthy-restaurants-menu-intelligence/sample-input.json`
- Create: `actors/healthy-restaurants-menu-intelligence/BENCHMARK_LONDON.md`

- [ ] **Step 1: Write honest Phase 1 documentation**

Describe the product goal, each input, planned record shape, dietary/nutrition provenance rules, responsible-use statement, and the explicit Phase 1 limitation: discovery and menu extraction are not implemented. State that no medical or allergen-safety guidance, OCR, PDF parsing, social scraping, multi-location runs, nutrition estimation, pricing changes, or publishing is included.

- [ ] **Step 2: Add the documented sample input**

```json
{
  "location": "London, United Kingdom",
  "keywords": ["healthy restaurant", "high protein restaurant", "healthy meal prep"],
  "maxRestaurants": 30,
  "includeMenu": true,
  "normalizedOutputLanguage": "en",
  "preserveOriginalText": true,
  "maxMenuPagesPerRestaurant": 3,
  "maxMenuItemsPerRestaurant": 200
}
```

`BENCHMARK_LONDON.md` must state that benchmark results are intentionally pending Phase 2 discovery and must not invent costs, runtimes, or cloud results.

- [ ] **Step 3: Perform local validation**

Run: `cd actors/healthy-restaurants-menu-intelligence && npm test && npm run lint && npm run build && npm run format:check && apify validate-schema`

Expected: every command exits `0`.

- [ ] **Step 4: Run the Actor locally with the sample input**

Run: `cd actors/healthy-restaurants-menu-intelligence && cp sample-input.json storage/key_value_stores/default/INPUT.json && apify run --purge`

Expected: exits `0`, logs the Phase 1 limitation, and produces no dataset records.

- [ ] **Step 5: Commit documentation and verification artifacts**

```bash
git add actors/healthy-restaurants-menu-intelligence/README.md actors/healthy-restaurants-menu-intelligence/sample-input.json actors/healthy-restaurants-menu-intelligence/BENCHMARK_LONDON.md
git commit -m "docs: describe healthy restaurants phase one"
```
