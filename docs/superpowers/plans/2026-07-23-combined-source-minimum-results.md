# Combined-source Minimum Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically raise combined Xero and QuickBooks runs to at least 14 maximum results while preserving lower single-source limits.

**Architecture:** Keep normalization inside `validateInput`, after source validation and deduplication. Compute the bounded requested limit once, then apply a combined-source floor only when both supported sources are present; the existing pipeline will expose the normalized value through `effectiveInput`.

**Tech Stack:** JavaScript ES modules, Vitest, ESLint, Prettier, Apify input/output schemas.

---

### Task 1: Add combined-source limit normalization

**Files:**
- Modify: `actors/xero-quickbooks-accounting-firm-leads/test/unit/core.test.js`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/src/schemas/validators.js`

- [ ] **Step 1: Write the failing validation tests**

Add these assertions to the existing input-validation test in `test/unit/core.test.js`:

```js
expect(
  validateInput({
    locations: ["London, United Kingdom"],
    sources: ["xero", "quickbooks"],
    maxResults: 10,
  }).maxResults,
).toBe(14);
expect(
  validateInput({
    locations: ["London, United Kingdom"],
    sources: ["xero", "quickbooks"],
    maxResults: 14,
  }).maxResults,
).toBe(14);
expect(
  validateInput({
    locations: ["London, United Kingdom"],
    sources: ["quickbooks"],
    maxResults: 10,
  }).maxResults,
).toBe(10);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
cd actors/xero-quickbooks-accounting-firm-leads
npm test -- test/unit/core.test.js
```

Expected: FAIL because the combined request still returns `maxResults: 10`.

- [ ] **Step 3: Implement the minimum normalization**

In `validateInput`, compute the bounded value before the return object and apply the floor only when both sources are selected:

```js
const requestedMaxResults = boundedInteger(
  raw.maxResults,
  100,
  1,
  5000,
  "maxResults",
);
const isCombinedSourceRun =
  sources.includes("xero") && sources.includes("quickbooks");
const maxResults = isCombinedSourceRun
  ? Math.max(requestedMaxResults, 14)
  : requestedMaxResults;
```

Return `maxResults` instead of calling `boundedInteger` inline.

- [ ] **Step 4: Run tests and verify they pass**

Run:

```bash
cd actors/xero-quickbooks-accounting-firm-leads
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit the behavior**

```bash
git add actors/xero-quickbooks-accounting-firm-leads/src/schemas/validators.js actors/xero-quickbooks-accounting-firm-leads/test/unit/core.test.js
git commit -m "feat: enforce combined-source result minimum"
```

### Task 2: Synchronize the public contract and benchmark

**Files:**
- Modify: `actors/xero-quickbooks-accounting-firm-leads/README.md`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/.actor/input_schema.json`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/.actor/output_schema.json`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/sample-input.json`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/BENCHMARK_NOTES.md`

- [ ] **Step 1: Update the contract files together**

Make these exact contract changes:

```json
"maxResults": 14
```

- Set the input-schema `maxResults.default` to `14` and describe the automatic 14-result floor when both sources are selected.
- Set the sample input and README example to `14`.
- Add README input guidance: combined Xero and QuickBooks requests below 14 are normalized to 14; single-source limits are unchanged.
- Update the output-schema summary description to say it contains the normalized effective input.
- Keep the 2026-07-23 cloud metrics in `BENCHMARK_NOTES.md`, record the observed 9:1 capped distribution, and state that future combined validation uses at least 14.

- [ ] **Step 2: Run the complete validation gate**

Run:

```bash
cd actors/xero-quickbooks-accounting-firm-leads
npm run lint
npm test
npm run build
npx prettier --write README.md BENCHMARK_NOTES.md sample-input.json .actor/input_schema.json .actor/output_schema.json src/schemas/validators.js test/unit/core.test.js
npm run format:check
apify validate-schema
git diff --check
```

Expected: lint, tests, build, formatting, all schemas, and diff checks pass. If ignored local `storage/` output is the only full-format failure, verify all tracked changed files explicitly with `npx prettier --check` and report the generated-storage exception.

- [ ] **Step 3: Commit the synchronized contract**

```bash
git add actors/xero-quickbooks-accounting-firm-leads/README.md actors/xero-quickbooks-accounting-firm-leads/.actor/input_schema.json actors/xero-quickbooks-accounting-firm-leads/.actor/output_schema.json actors/xero-quickbooks-accounting-firm-leads/sample-input.json actors/xero-quickbooks-accounting-firm-leads/BENCHMARK_NOTES.md
git commit -m "docs: document combined-source result minimum"
```

### Task 3: Verify final repository state

**Files:**
- Verify only; no expected file changes.

- [ ] **Step 1: Confirm commits and worktree cleanliness**

Run:

```bash
git status --short --branch
git log --oneline -4
```

Expected: the implementation worktree is clean and contains the behavior and contract commits. Do not push, publish, or change pricing.
