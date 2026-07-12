# Actor Factory Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the lead-scraper template generate self-contained, contract-validated Actors with repeatable local benchmark tooling, without changing existing Actor directories.

**Architecture:** Keep reusable runtime code under `templates/lead-scraper-template/src/`, where the generator copies it into every new Actor. Convert the generator into importable functions for Node-native tests, render a niche configuration module, validate generated files statically, and drive benchmark inputs from niche JSON.

**Tech Stack:** Node.js ESM, Node built-in `node:test`, Apify CLI, existing Apify/Crawlee dependencies.

---

## File map

- `scripts/generate-actor.js`: importable template renderer and CLI entry point.
- `scripts/validate-actor-files.js`: static generated-Actor contract validator.
- `scripts/run-local-benchmark.js`: manual local benchmark runner with a dry-run mode.
- `templates/lead-scraper-template/src/niche-config.js`: generated niche-specific runtime configuration.
- `templates/lead-scraper-template/src/lead-utils.js`: pure scoring, query, and input-resolution helpers.
- `templates/lead-scraper-template/src/lead-scraper.js`: browser-backed scraper orchestration.
- `templates/lead-scraper-template/src/main.js`: short Actor lifecycle entry point.
- `test/factory.test.js`: Node-native tests for generator and static validation.
- `niches/*.json`: benchmark inputs and required positioning metadata.
- `ACTOR_TEMPLATE.md`, `BENCHMARKS.md`, `ROADMAP.md`: factory operating documents.

### Task 1: Add testable generator and validator boundaries

**Files:**
- Create: `test/factory.test.js`
- Modify: `package.json`
- Modify: `scripts/generate-actor.js`
- Create: `scripts/validate-actor-files.js`
- Create: `templates/lead-scraper-template/src/niche-config.js`

- [ ] **Step 1: Write failing generator tests**

```js
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { generateActor } from '../scripts/generate-actor.js';
import { validateActorFiles } from '../scripts/validate-actor-files.js';

test('generates a self-contained Actor from the hotel niche', async () => {
    const outputDir = path.join(await mkdtemp(path.join(os.tmpdir(), 'actor-factory-')), 'actor');
    const actorDir = await generateActor({ nicheKey: 'hotel', outputDir });

    assert.match(await readFile(path.join(actorDir, 'src/niche-config.js'), 'utf8'), /hotelTypes/);
    assert.equal((await validateActorFiles(actorDir)).valid, true);
});

test('rejects generated Actors with unresolved factory placeholders', async () => {
    const outputDir = path.join(await mkdtemp(path.join(os.tmpdir(), 'actor-factory-')), 'actor');
    const actorDir = await generateActor({ nicheKey: 'spa', outputDir });
    await writeFile(path.join(actorDir, 'README.md'), '{{ACTOR_NAME}}');

    assert.match((await validateActorFiles(actorDir)).errors.join('\n'), /unresolved placeholder/i);
});
```

- [ ] **Step 2: Run the new test file and confirm it fails because exports do not exist**

Run: `node --test test/factory.test.js`

Expected: failure resolving `generateActor` and `validateActorFiles`.

- [ ] **Step 3: Export the generator API while preserving CLI behavior**

Refactor `scripts/generate-actor.js` so parsing CLI arguments calls this API:

```js
export async function generateActor({ nicheKey, nicheFile, outputDir, rootDir = process.cwd() }) {
    // Read the niche, reject an existing output directory, copy the template,
    // replace placeholders, and return the absolute generated Actor path.
}

if (import.meta.url === `file://${process.argv[1]}`) {
    // Parse <niche> [--niche-file <path>] [--output-dir <path>],
    // call generateActor(), and print the existing command-line summary.
}
```

Keep `node scripts/generate-actor.js hotel` behavior unchanged and keep all copied Actor files inside the output directory.

- [ ] **Step 4: Add a generated niche configuration skeleton**

Create `templates/lead-scraper-template/src/niche-config.js` and add `{{MULTI_SEARCH_CONFIG_JSON}}` to the generator replacements:

```js
export const nicheConfig = {
    actorName: '{{ACTOR_NAME}}',
    defaultKeyword: '{{DEFAULT_KEYWORD}}',
    defaultLocation: '{{DEFAULT_LOCATION}}',
    multiSearch: {{MULTI_SEARCH_CONFIG_JSON}},
};
```

Use `JSON.stringify(niche.multiSearch ?? null)` for the replacement. This makes the generated Actor self-contained before the runtime extraction begins.

- [ ] **Step 5: Implement the static validator**

Export this result shape from `scripts/validate-actor-files.js`:

```js
export async function validateActorFiles(actorDir) {
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
```

Validate `.actor/actor.json`, `.actor/input_schema.json`, `.actor/output_schema.json`, `.actor/dataset_schema.json`, `README.md`, `src/main.js`, `src/niche-config.js`, and `storage/key_value_stores/default/INPUT.json`. Reject generator markers (`{{ACTOR_NAME}}`, `{{NICHE}}`, `{{SHORT_DESCRIPTION}}`, conditional markers), missing sample input, and dataset fields not listed in the README output table. Warn when the README omits an optional `error` dataset field.

- [ ] **Step 6: Add the root test command**

Add this root script without adding dependencies:

```json
"test:factory": "node --test test/factory.test.js"
```

- [ ] **Step 7: Run the red-green checks**

Run:

```bash
npm run test:factory
node scripts/generate-actor.js hotel --output-dir /tmp/vietnam-hotel-template-check
node scripts/validate-actor-files.js /tmp/vietnam-hotel-template-check
```

Expected: tests pass; the generated temporary Actor validates; no existing `actors/` directory is changed.

### Task 2: Make the template runtime modular and configuration-driven

**Files:**
- Create: `templates/lead-scraper-template/src/niche-config.js`
- Create: `templates/lead-scraper-template/src/lead-utils.js`
- Create: `templates/lead-scraper-template/src/lead-scraper.js`
- Modify: `templates/lead-scraper-template/src/main.js`
- Create: `templates/lead-scraper-template/test/lead-utils.test.js`
- Modify: `templates/lead-scraper-template/package.json`

- [ ] **Step 1: Write failing pure-helper tests**

```js
import { describe, expect, it } from 'vitest';
import { getLeadQuality, getLeadScore, resolveSearchConfig } from '../src/lead-utils.js';

describe('resolveSearchConfig', () => {
    it('uses city, type list, and per-type limit for a multi-search niche', () => {
        expect(resolveSearchConfig(
            { city: 'Da Nang', hotelTypes: ['resort'] },
            {
                defaultKeyword: 'hotel',
                defaultLocation: 'Da Nang',
                multiSearch: {
                    locationInputField: 'city',
                    typeInputField: 'hotelTypes',
                    maxResultsInputField: 'maxResultsPerType',
                    defaultTypes: ['hotel'],
                },
            },
        )).toMatchObject({
            location: 'Da Nang',
            types: ['resort'],
            maxResults: 20,
        });
    });
});

it('classifies a complete contact record as high quality', () => {
    expect(getLeadQuality(getLeadScore({ email: 'a@b.co', website: 'https://b.co', phone: '1', rating: '4.5', address: 'x', googleMapsUrl: 'y' }))).toBe('high');
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run: `cd templates/lead-scraper-template && npm test -- test/lead-utils.test.js`

Expected: failure because `src/lead-utils.js` does not exist.

- [ ] **Step 3: Implement pure utility functions**

Move only deterministic code into `lead-utils.js`: input resolution, query construction, email text normalization, lead scoring, quality classification, and dedupe-key creation. `resolveSearchConfig(input, nicheConfig)` must accept both the documented fields and existing fallback aliases (`location`, `keyword`, `maxResults`, `useApifyProxy`) for multi-search niches.

- [ ] **Step 4: Move browser behavior into the scraper module**

Move Playwright launch, proxy creation, place collection, website email extraction, place detail extraction, batching, and `Actor.pushData()` into `runLeadScraper({ input, config })` in `lead-scraper.js`. Use `apify/log` for all logs and close browser/context resources in `finally` blocks.

- [ ] **Step 5: Replace the entry point with the Actor lifecycle only**

`src/main.js` should initialize the Actor, read input, call `runLeadScraper`, and always call `Actor.exit()`:

```js
import { Actor } from 'apify';
import { nicheConfig } from './niche-config.js';
import { runLeadScraper } from './lead-scraper.js';

await Actor.init();
try {
    await runLeadScraper({ input: (await Actor.getInput()) ?? {}, config: nicheConfig });
} finally {
    await Actor.exit();
}
```

- [ ] **Step 6: Run template unit checks**

Run:

```bash
cd templates/lead-scraper-template
npm test -- test/lead-utils.test.js
node --check src/main.js
node --check src/lead-utils.js
node --check src/lead-scraper.js
```

Expected: unit tests and syntax checks pass.

### Task 3: Add niche metadata, sample inputs, and benchmark definitions

**Files:**
- Modify: `niches/dental-clinic.json`
- Modify: `niches/english-center.json`
- Modify: `niches/gym.json`
- Modify: `niches/hotel.json`
- Modify: `niches/real-estate-agency.json`
- Modify: `niches/restaurant.json`
- Modify: `niches/spa.json`
- Modify: `niches/travel-agency.json`
- Modify: `niches/wedding-venue.json`
- Modify: `scripts/generate-actor.js`
- Modify: `templates/lead-scraper-template/README.md`
- Create: `templates/lead-scraper-template/storage/key_value_stores/default/INPUT.json`

- [ ] **Step 1: Write a failing test for generated sample input**

Add this test to `test/factory.test.js`:

```js
test('renders the niche sample input into generated Actor storage', async () => {
    const actorDir = await generateActor({
        nicheKey: 'spa',
        outputDir: path.join(await mkdtemp(path.join(os.tmpdir(), 'actor-factory-')), 'actor'),
    });
    const input = JSON.parse(await readFile(path.join(actorDir, 'storage/key_value_stores/default/INPUT.json'), 'utf8'));

    assert.deepEqual(input, { keyword: 'spa', location: 'Ho Chi Minh', maxResults: 20, batchSize: 5, extractEmails: true, useApifyProxy: false });
});
```

- [ ] **Step 2: Run the test and confirm the current template does not render niche-specific storage input**

Run: `npm run test:factory`

Expected: failure because the generated input is missing or retains template content.

- [ ] **Step 3: Add required niche fields**

Every niche JSON must define:

```json
{
  "targetUser": "...",
  "buyerPainPoint": "...",
  "differentiation": "...",
  "sampleInput": {},
  "benchmarkInputs": [{ "label": "smoke", "input": {} }, { "label": "email-baseline", "input": {} }, { "label": "broader-search", "input": {} }]
}
```

Use safe local defaults: smoke inputs with low result counts and email extraction off; benchmark inputs may use up to 20 results and must not enable proxy by default.

- [ ] **Step 4: Render sample input and README positioning from niche data**

Add `{{SAMPLE_INPUT_JSON}}`, `{{TARGET_USER}}`, `{{BUYER_PAIN_POINT}}`, and `{{DIFFERENTIATION}}` replacements. Make the generated README include a niche-specific buyer/use-case section and a benchmark note pointing to `BENCHMARKS.md`.

- [ ] **Step 5: Run contract tests**

Run: `npm run test:factory`

Expected: the generated spa sample input equals its niche definition and the static validator accepts every generated temporary Actor.

### Task 4: Add benchmark and operating documentation

**Files:**
- Create: `ACTOR_TEMPLATE.md`
- Create: `BENCHMARKS.md`
- Create: `ROADMAP.md`
- Create: `scripts/run-local-benchmark.js`
- Modify: `package.json`
- Modify: `AGENTS.md`
- Modify: `test/factory.test.js`

- [ ] **Step 1: Write a failing dry-run benchmark test**

```js
test('prints the selected benchmark input without starting an Actor in dry-run mode', async () => {
    const nicheFile = path.resolve('niches/hotel.json');
    const niche = JSON.parse(await readFile(nicheFile, 'utf8'));
    const result = await runBenchmark({ actorDir: '/tmp/example-actor', nicheFile, benchmarkLabel: 'smoke', dryRun: true });

    assert.equal(result.executed, false);
    assert.deepEqual(result.input, niche.benchmarkInputs[0].input);
});
```

- [ ] **Step 2: Run the test and confirm the benchmark module is unavailable**

Run: `npm run test:factory`

Expected: failure resolving `runBenchmark`.

- [ ] **Step 3: Implement the benchmark runner**

Export `runBenchmark({ actorDir, nicheFile, benchmarkLabel, dryRun = false })`. It must:

1. Read the named benchmark input from the niche file.
2. Return it without side effects in dry-run mode.
3. In normal mode, write a temporary JSON input, run `apify run --input-file <temp file>` from `actorDir`, read the local dataset, calculate result, phone, website, and email counts, and append one Markdown table row to `BENCHMARKS.md`.
4. Report duration and an explicit `cost estimate: local-only / not available` value; never invent a monetary figure.

- [ ] **Step 4: Add factory documentation**

`ACTOR_TEMPLATE.md` documents niche JSON requirements, generated files, standalone deployment rule, validation, and the no-auto-publish policy. `BENCHMARKS.md` contains the canonical table header and the required metrics. `ROADMAP.md` lists the nine existing Actors as pending migration after factory verification, then defines weekly selection, benchmark, cloud-test, and selective-publish stages.

- [ ] **Step 5: Add root commands**

Add these scripts:

```json
"validate:actor": "node scripts/validate-actor-files.js",
"benchmark": "node scripts/run-local-benchmark.js"
```

Update `AGENTS.md` to require `npm run validate:actor -- <actor-dir>` before a benchmark or publish decision, while preserving existing no-publish/no-pricing rules.

- [ ] **Step 6: Run dry-run benchmark verification**

Run:

```bash
npm run test:factory
npm run benchmark -- --actor-dir /tmp/vietnam-hotel-template-check --niche-file niches/hotel.json --label smoke --dry-run
```

Expected: tests pass and dry-run prints input metadata without invoking an Actor or changing benchmark records.

### Task 5: Verify a freshly generated Actor end to end without touching existing Actors

**Files:**
- No source changes expected

- [ ] **Step 1: Render the hotel niche to a disposable directory**

Run:

```bash
node scripts/generate-actor.js hotel --output-dir /tmp/vietnam-hotel-template-check
```

Expected: generated Actor contains `src/niche-config.js`, modular runtime files, schemas, README, sample input, and no unresolved template markers.

- [ ] **Step 2: Validate the generated Actor**

Run:

```bash
node scripts/validate-actor-files.js /tmp/vietnam-hotel-template-check
cd /tmp/vietnam-hotel-template-check && apify validate-schema
```

Expected: validator and Apify schema validation exit successfully.

- [ ] **Step 3: Verify generated source and test contracts**

Run:

```bash
node --check /tmp/vietnam-hotel-template-check/src/main.js
node --check /tmp/vietnam-hotel-template-check/src/lead-utils.js
node --check /tmp/vietnam-hotel-template-check/src/lead-scraper.js
cd /tmp/vietnam-hotel-template-check && npm test -- test/lead-utils.test.js
```

Expected: syntax and pure utility tests pass. Do not run a network benchmark or publish in this phase.

- [ ] **Step 4: Confirm scope**

Run:

```bash
find actors -maxdepth 2 -type f -name main.js | wc -l
```

Expected: existing Actor count remains 9; no existing Actor source was regenerated.

## Plan self-review

- Scope coverage: generator, deployable shared template, contract validation, niche metadata, sample input, benchmark workflow, docs, and temporary-Actor verification are covered.
- No placeholders: all planned modules, paths, commands, and expected outcomes are explicit.
- Boundary check: the only runtime sharing is copied template code, never a factory-root import; existing Actor directories are explicitly excluded.
