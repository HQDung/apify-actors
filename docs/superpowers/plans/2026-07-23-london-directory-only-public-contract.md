# London Directory-only Public Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Force all runs to London, United Kingdom, reject unsupported website enrichment, and align every public Actor surface with that validated directory-only scope.

**Architecture:** Canonicalize hidden runtime fields in `validateInput`: locations always become London and enrichment always becomes false unless a caller requests true, which fails before source work. Remove both controls from the public schema while retaining their internal normalized values for adapters and `effectiveInput`.

**Tech Stack:** JavaScript ES modules, Vitest, Apify Actor schemas, Markdown, JSON, ESLint, Prettier.

---

### Task 1: Canonicalize London input and reject enrichment

**Files:**
- Modify: `actors/xero-quickbooks-accounting-firm-leads/test/unit/core.test.js`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/src/schemas/validators.js`

- [ ] **Step 1: Replace location/enrichment tests with the new contract**

Add or update assertions in `test/unit/core.test.js`:

```js
expect(
  validateInput({ sources: ["xero"], maxResults: 25 }),
).toEqual(
  expect.objectContaining({
    locations: ["London, United Kingdom"],
    sources: ["xero"],
    maxResults: 25,
    enrichWebsites: false,
  }),
);

expect(
  validateInput({
    locations: ["New York, NY"],
    sources: ["quickbooks"],
    maxResults: 10,
  }).locations,
).toEqual(["London, United Kingdom"]);

expect(
  validateInput({
    locations: [],
    sources: ["quickbooks"],
    enrichWebsites: false,
  }).enrichWebsites,
).toBe(false);

expect(() =>
  validateInput({
    sources: ["xero", "quickbooks"],
    enrichWebsites: true,
  }),
).toThrow(
  "Website enrichment is not implemented. Remove enrichWebsites or set it to false.",
);
```

Update mocked-pipeline expectations so searches, profile context, and `effectiveInput.locations` use `London, United Kingdom` even when legacy input supplies another value.

- [ ] **Step 2: Run the focused test and verify failure**

```bash
cd actors/xero-quickbooks-accounting-firm-leads
npm test -- test/unit/core.test.js
```

Expected: FAIL because locations are still user-controlled and omitted enrichment still defaults true.

- [ ] **Step 3: Implement canonical validation**

Replace the user-location parsing block with a canonical constant and add enrichment rejection before returning input:

```js
const LONDON_LOCATION = "London, United Kingdom";

export const validateInput = (raw = {}) => {
  const locations = [LONDON_LOCATION];

  // existing source and maxResults validation

  if (raw.enrichWebsites === true) {
    throw new Error(
      "Website enrichment is not implemented. Remove enrichWebsites or set it to false.",
    );
  }

  return {
    locations,
    sources,
    maxResults,
    enrichWebsites: false,
    extractContacts: raw.extractContacts !== false,
    includeRawData: raw.includeRawData === true,
    proxyConfiguration: raw.proxyConfiguration ?? { useApifyProxy: true },
  };
};
```

Remove obsolete location array/type/count validation. Preserve source validation, result bounds, combined-source floor, contact filtering, raw-data, and proxy behavior.

- [ ] **Step 4: Run tests and commit behavior**

```bash
cd actors/xero-quickbooks-accounting-firm-leads
npm test
git add src/schemas/validators.js test/unit/core.test.js
git commit -m "feat: force London directory-only input"
```

Expected: all tests pass and only the validator/tests are committed.

### Task 2: Align all Actor surfaces to London directory-only beta

**Files:**
- Modify: `actors/xero-quickbooks-accounting-firm-leads/.actor/actor.json`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/.actor/input_schema.json`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/.actor/output_schema.json`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/.actor/dataset_schema.json`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/README.md`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/sample-input.json`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/BENCHMARK_NOTES.md`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/test/fixtures/quickbooks/smoke-input.json`

- [ ] **Step 1: Update metadata and public schemas together**

Apply these contract changes:

- Use `London Xero & QuickBooks Accounting Firm Leads` for Actor, input, output, and dataset titles.
- Describe the Actor as a London, United Kingdom directory-profile beta; remove `worldwide` and `enrich` claims.
- Remove `locations` and `enrichWebsites` properties from `.actor/input_schema.json` and remove `locations` from `required` (omit `required` if empty).
- Describe `maxResults` as London results and retain the combined-source minimum.
- Change output summary wording from enrichment counters to directory/result/source-failure counters.
- Label the dataset as London accounting firm leads.

- [ ] **Step 2: Update examples, README, fixture, and benchmarks together**

Use this public sample shape in `sample-input.json` and README:

```json
{
  "sources": ["xero", "quickbooks"],
  "maxResults": 14,
  "extractContacts": false,
  "includeRawData": false,
  "proxyConfiguration": { "useApifyProxy": false }
}
```

Document that location is fixed to London, API-supplied locations are ignored, enrichment is unavailable, and website fields are directory-published values. Update the Vietnamese summary with the same London/UK limitation. Change the QuickBooks smoke input fixture to London scope and remove public-hidden fields. Remove New York, Sydney, and Singapore planned benchmarks; retain London source-only and combined validation plans. Preserve responsible-use wording and observed cloud metrics.

- [ ] **Step 3: Verify no unsupported public claims remain**

```bash
cd actors/xero-quickbooks-accounting-firm-leads
grep -RIn --exclude-dir=node_modules --exclude-dir=storage --exclude=package-lock.json "worldwide\|New York\|Sydney\|Singapore\|Enrich company websites" .
```

Expected: no matches in tracked Actor contract files or fixtures.

- [ ] **Step 4: Run schema and formatting checks, then commit**

```bash
npx prettier --write .actor/actor.json .actor/input_schema.json .actor/output_schema.json .actor/dataset_schema.json README.md sample-input.json BENCHMARK_NOTES.md test/fixtures/quickbooks/smoke-input.json
apify validate-schema
npx prettier --check .actor/actor.json .actor/input_schema.json .actor/output_schema.json .actor/dataset_schema.json README.md sample-input.json BENCHMARK_NOTES.md test/fixtures/quickbooks/smoke-input.json
git diff --check
git add .actor/actor.json .actor/input_schema.json .actor/output_schema.json .actor/dataset_schema.json README.md sample-input.json BENCHMARK_NOTES.md test/fixtures/quickbooks/smoke-input.json
git commit -m "docs: scope Actor to London directory leads"
```

Expected: Actor schemas are valid, changed files are formatted, and all coordinated contract files are committed.

### Task 3: Run final validation

**Files:**
- Verify only; no expected modifications.

- [ ] **Step 1: Run the full static gate**

```bash
cd actors/xero-quickbooks-accounting-firm-leads
npm run lint
npm test
npm run build
npm run format:check
apify validate-schema
git diff --check
git status --short --branch
```

Expected: lint, all tests, build, tracked formatting, all schemas, and diff checks pass with a clean feature worktree. Do not push, publish, or change pricing.
