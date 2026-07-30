# Healthy Restaurants Phase 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Phase 1–5 restaurant Actor reliable, measurable, documented, and ready for Store publication without adding new product features.

**Architecture:** Preserve the current Playwright discovery and deterministic HTML menu pipeline. Add focused runtime policy and statistics modules, pass bounded settings into existing network operations, and isolate failures at the existing job/restaurant/menu-page boundaries. Store benchmark evidence under `validation/phase-6/` and keep the dataset contract unchanged unless validation requires a compatibility-preserving fix.

**Tech Stack:** JavaScript ES modules, Apify SDK, Playwright, Vitest, ESLint, Prettier, Apify CLI, JSON schema validation.

---

### Task 1: Establish the Phase 6 baseline and runtime policy contract

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/src/runtime/reliability.js`
- Create: `actors/healthy-restaurants-menu-intelligence/test/unit/reliability.test.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/.actor/actor.json` only if `meta.generatedBy` is not already `Codex with GPT-5`

- [ ] **Step 1: Confirm the Phase 5 gate and current CLI configuration**

Run from `actors/healthy-restaurants-menu-intelligence`:

```bash
rg -n "READY_FOR_PHASE_6" validation/phase-5/validation-report.md
apify --help
node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts,null,2))"
```

Expected: the Phase 5 report contains `READY_FOR_PHASE_6`, Apify CLI help exits `0`, and no unconfigured `typecheck` command is invented.

- [ ] **Step 2: Write failing tests for bounded policy and retry classification**

Add tests with these behaviors:

```js
import { describe, expect, it } from "vitest";
import {
  DEFAULT_RUNTIME_POLICY,
  isRetryableError,
  retryOperation,
} from "../../src/runtime/reliability.js";

describe("runtime reliability policy", () => {
  it("keeps Version 1 concurrency and network limits bounded", () => {
    expect(DEFAULT_RUNTIME_POLICY).toMatchObject({
      browserConcurrency: 4,
      websiteConcurrency: 3,
      timeoutMs: 30_000,
      navigationTimeoutMs: 60_000,
      maxRedirects: 3,
      maxAttempts: 2,
    });
  });

  it("retries a transient operation once and returns its later result", async () => {
    let attempts = 0;
    const result = await retryOperation(
      async () => {
        attempts += 1;
        if (attempts === 1) throw Object.assign(new Error("reset"), { code: "ECONNRESET" });
        return "ok";
      },
      { maxAttempts: 2, baseDelayMs: 0 },
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("does not retry deterministic invalid-input failures", async () => {
    let attempts = 0;
    await expect(
      retryOperation(
        async () => {
          attempts += 1;
          throw Object.assign(new Error("invalid URL"), { code: "ERR_INVALID_URL" });
        },
        { maxAttempts: 2, baseDelayMs: 0 },
      ),
    ).rejects.toThrow("invalid URL");
    expect(attempts).toBe(1);
    expect(isRetryableError(Object.assign(new Error("bad"), { status: 404 }))).toBe(false);
  });
});
```

Run: `npm test -- --run test/unit/reliability.test.js`

Expected: FAIL because the runtime module and exported policy do not exist.

- [ ] **Step 3: Implement the smallest policy module**

Implement `DEFAULT_RUNTIME_POLICY`, `isRetryableError`, and `retryOperation`. Retry only `408`, `425`, `429`, `5xx`, `ECONNRESET`, `ETIMEDOUT`, `ECONNREFUSED`, `EAI_AGAIN`, abort/timeout messages, and never exceed `maxAttempts`. Use `setTimeout` with `baseDelayMs * 2 ** (attempt - 1)` and cap the delay at `1000` ms.

- [ ] **Step 4: Run the focused test and full baseline suite**

Run:

```bash
npm test -- --run test/unit/reliability.test.js
npm test
```

Expected: the focused tests pass and all pre-existing Phase 5 tests remain green.

### Task 2: Harden website/menu network operations and resource limits

**Files:**
- Modify: `actors/healthy-restaurants-menu-intelligence/src/website/menu-discovery.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/website/crawl-restaurant-website.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/menu/process-menu-page.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/test/unit/website.test.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/test/unit/process-menu-page.test.js`

- [ ] **Step 1: Add failing tests for retry, redirect bounds, and deterministic HTTP handling**

Cover a `503` then `200` fetch sequence, a `404` single-attempt sequence, and a redirect chain that fails after the configured maximum. Assert that response body parsing is bounded by the configured timeout and that the returned error does not contain the full response body.

Run: `npm test -- --run test/unit/website.test.js test/unit/process-menu-page.test.js`

Expected: the new tests fail against the current one-attempt fetch behavior.

- [ ] **Step 2: Implement policy-aware fetches**

Pass `DEFAULT_RUNTIME_POLICY` defaults into `fetchWithRedirects`, `crawlRestaurantWebsite`, and `processMenuPage`. Retry only transient fetch/status failures, preserve manual redirect handling, stop at three redirects, and classify deterministic `4xx`/invalid URL failures without retrying.

- [ ] **Step 3: Enforce bounded HTML processing**

Add an internal maximum response-body size of `2_000_000` characters. Read through the existing timeout helper, abort/reject oversized bodies with a concise deterministic error, and ensure local `html` references are released after extraction by keeping parsing in the operation scope.

- [ ] **Step 4: Run focused and regression tests**

Run:

```bash
npm test -- --run test/unit/website.test.js test/unit/process-menu-page.test.js
npm test
```

Expected: all focused tests and the full suite pass.

### Task 3: Standardize failure categories and preserve sibling work

**Files:**
- Modify: `actors/healthy-restaurants-menu-intelligence/src/discovery/google-maps.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/main.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/menu/process-menu-page.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/website/crawl-restaurant-website.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/test/unit/discovery.test.js`
- Create or modify: `actors/healthy-restaurants-menu-intelligence/test/integration/reliability-isolation.test.js`

- [ ] **Step 1: Write failing isolation tests**

Test that a failed detail extraction returns a normalized restaurant with a discovery warning, a failed website preserves a valid restaurant with `website_unreachable`, and one failed menu candidate does not prevent a later candidate from producing items. Test the `includeMenu: false` path has no website fetches and remains `not_requested`.

Run: `npm test -- --run test/integration/reliability-isolation.test.js test/unit/discovery.test.js`

Expected: the new category/isolation assertions fail or expose the current generic category behavior.

- [ ] **Step 2: Implement narrow error normalization**

Map errors at module boundaries to the approved Phase 6 categories while retaining source URLs and concise messages. Do not include response bodies, headers, cookies, tokens, or full HTML. Preserve existing public status values and Phase 5 provenance fields.

- [ ] **Step 3: Verify Playwright cleanup paths**

Keep context creation paired with `finally` closure in discovery jobs and detail extraction, and browser closure in `main.js` `finally`. Add test doubles that record `close()` calls for both success and failure paths.

- [ ] **Step 4: Run isolation and full tests**

Run the focused integration/unit tests followed by `npm test`. Expected: all sibling-isolation and cleanup tests pass with no regression.

### Task 4: Add aggregate run statistics and final summary logging

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/src/runtime/run-statistics.js`
- Modify: `actors/healthy-restaurants-menu-intelligence/src/main.js`
- Create: `actors/healthy-restaurants-menu-intelligence/test/unit/run-statistics.test.js`

- [ ] **Step 1: Write failing statistics tests**

Test that a new collector starts all requested counters at zero, increments counters without allowing negative values, calculates runtime from a supplied start time, and returns an immutable JSON-safe summary containing search jobs, discovery, website, menu, item, classification, warning/error, pushed-result, and runtime metrics.

Run: `npm test -- --run test/unit/run-statistics.test.js`

Expected: FAIL because the collector does not exist.

- [ ] **Step 2: Implement the collector**

Expose `createRunStatistics({ now = Date.now })`, `increment(name, amount = 1)`, `set(name, value)`, and `summary({ finishedAt = now() } = {})`. Clamp counters to non-negative integers, keep runtime numeric, and return a new object from `summary` so callers cannot mutate internal state.

- [ ] **Step 3: Integrate stage counters in `main.js`**

Update counters after search jobs, raw cards, deduplication, restaurant processing, website availability/reachability, menu candidate/page results, item limits, dietary/nutrition presence, classification distribution, warnings/errors, and successful `Actor.pushData`. Log one concise JSON line beginning `Run summary:` in the final success path and include summary logging in the failure path when possible.

- [ ] **Step 4: Run focused and full tests**

Run `npm test -- --run test/unit/run-statistics.test.js` and then `npm test`. Expected: the counter assertions and all existing tests pass.

### Task 5: Finalize samples, README, metadata, and benchmark inputs

**Files:**
- Modify: `actors/healthy-restaurants-menu-intelligence/README.md`
- Modify: `actors/healthy-restaurants-menu-intelligence/BENCHMARK_LONDON.md`
- Modify: `actors/healthy-restaurants-menu-intelligence/sample-input.json`
- Create: `actors/healthy-restaurants-menu-intelligence/sample-output.json`
- Modify: `actors/healthy-restaurants-menu-intelligence/.actor/actor.json`
- Create: `actors/healthy-restaurants-menu-intelligence/validation/phase-6/small-benchmark-input.json`
- Create: `actors/healthy-restaurants-menu-intelligence/validation/phase-6/standard-benchmark-input.json`

- [ ] **Step 1: Add exact benchmark inputs**

Use the requested small input (`maxRestaurants: 10`, `keywords: ["healthy restaurant"]`) and standard input (`maxRestaurants: 30`, keywords `healthy restaurant`, `high protein restaurant`, `healthy meal prep`, `salad bar`) with `includeMenu: true`, `normalizedOutputLanguage: "en"`, and `preserveOriginalText: true`.

- [ ] **Step 2: Create a validated sample output**

Derive `sample-output.json` from a local Actor result or existing deterministic fixture, validate it through `isRestaurantOutput`, and ensure it demonstrates restaurant data, healthy evidence, dietary provenance, menu status, price handling, published nutrition where available, and a valid partial/no-nutrition path without fabricating values.

- [ ] **Step 3: Update README and Store metadata**

Document Version 1 scope, global-first/London-tested status, supported HTML/JSON menu formats, unsupported PDF/image/third-party formats, all public input fields, output fields, retry/limit behavior at a user-meaningful level, measured benchmark results only, provenance rules, published-nutrition-only rule, responsible-use wording, limitations, roadmap, title, and short description. Keep the title `Healthy Restaurants & Menu Intelligence` and description focused on structured healthy restaurant/menu intelligence rather than generic Maps scraping.

- [ ] **Step 4: Run formatting and schema checks**

Run `npm run format:check` and `npx apify validate-schema`. Expected: both pass.

### Task 6: Run local small/standard benchmarks and collect artifacts

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/validation/phase-6/local-benchmark-results.json`
- Create: `actors/healthy-restaurants-menu-intelligence/validation/phase-6/sampled-output.json`

- [ ] **Step 1: Run the small local Actor benchmark**

Run with the exact saved input:

```bash
/usr/bin/time -p apify run --purge --input-file ./validation/phase-6/small-benchmark-input.json
```

Capture exit code, runtime, aggregate summary, dataset record count, menu status distribution, schema-validity rate, duplicate rate, and coverage counters.

- [ ] **Step 2: Run the standard local Actor benchmark**

Run the same command with `standard-benchmark-input.json` and capture the same fields. Do not claim compute cost if the local CLI does not report it.

- [ ] **Step 3: Inspect and validate outputs**

Read the resulting dataset records, select a representative sample without changing its values, validate every record with the existing validator, and save the sample to `sampled-output.json`.

- [ ] **Step 4: Save measured local results**

Write `local-benchmark-results.json` with separate `small` and `standard` entries, exact input paths, runtime, records, coverage, statuses, errors/warnings, schema validity, duplicate count, and `computeCost: null` when unavailable.

### Task 7: Run authenticated cloud smokes without auto-publishing

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/validation/phase-6/cloud-benchmark-results.json`

- [ ] **Step 1: Check authenticated Actor availability**

Run `apify info` and inspect the existing remote Actor/build using read-only CLI commands. Do not run `apify push`.

- [ ] **Step 2: Run equivalent cloud inputs when an existing version is callable**

Run menu-enabled, menu-disabled, and multiple-keyword calls against the existing authenticated Actor version with the saved input files. Capture run IDs, status, runtime, cost/compute fields reported by Apify, dataset record counts, schema validity, status distributions, and any source-version difference.

- [ ] **Step 3: Record unavailable cloud evidence honestly**

If DNS/authentication/Actor availability prevents a call, write the exact command, exit code, and error category in `cloud-benchmark-results.json`; set `available: false` and do not invent cost, runtime, or coverage.

- [ ] **Step 4: Validate the cloud artifact**

Parse the JSON artifact and ensure the result distinguishes measured cloud values from unavailable fields.

### Task 8: Produce the publish-readiness report and complete verification

**Files:**
- Create: `actors/healthy-restaurants-menu-intelligence/validation/phase-6/publish-readiness-report.md`
- Modify: `actors/healthy-restaurants-menu-intelligence/BENCHMARK_LONDON.md`

- [ ] **Step 1: Write the report from measured evidence**

Include executive summary, Phase 5 prerequisite, commands and exits, reliability fixes, policy/concurrency/timeout settings, local and cloud benchmarks, runtime/cost, output-quality sample review, schema validation, README/store review, known limitations, remaining risks, and exactly one final recommendation among `READY_TO_PUBLISH`, `NEEDS_PHASE_6_FIXES`, or `BLOCKED`.

- [ ] **Step 2: Run the complete configured verification matrix**

Run only configured commands:

```bash
npm run build
npm run lint
npm test
npm run format:check
npx apify validate-schema
npm test -- --run test/integration
git diff --check
```

Also run both local benchmark inputs and parse every Phase 6 JSON artifact. If a type-check script is absent, state that fact in the report rather than inventing one.

- [ ] **Step 3: Review scope and recommendation**

Confirm no Phase 1–5 feature behavior outside reliability was added, no auto-publish/pricing action occurred, every report enum alternative appears zero times except the single final recommendation, and all measured claims match artifacts.

- [ ] **Step 4: Stop after Phase 6**

Report changed files, reliability fixes, settings, commands, tests, local/cloud results, runtime/cost availability, schemas, README changes, known limitations, and the final recommendation. Do not begin Version 1.1.
