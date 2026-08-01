# Cross-Platform Actor Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox syntax - [ ] for tracking.

**Goal:** Build the Apify Actor boundary that validates explicit product mappings before any review collection or comparison logic.

**Architecture:** The Actor normalizes product IDs/URLs into the dependency-free comparison-core mapping, rejects ambiguous duplicates and unsupported modes, stores normalized input and zero-collection run statistics, and emits scoped run errors. Source collection is deliberately deferred.

**Tech Stack:** JavaScript ES modules, Apify SDK/CLI, Node built-in test runner, vendored comparison-core package.

---

### Task 1: Test product mapping and runtime statistics

**Files:**
- Create: actors/cross-platform-mobile-feedback/test/normalize-input.test.mjs
- Create: actors/cross-platform-mobile-feedback/test/run-stats.test.mjs

- [x] **Step 1: Test explicit ID precedence, one/both platform rules, duplicates, modes, and release metadata**

Cover Google Play and Apple URL parsing, canonical product output, duplicate app IDs, compare/release requirements, and malformed IDs.

- [x] **Step 2: Test zero-collection statistics**

Verify the skeleton exposes product count and zero review/analysis/cluster/comparison counters.

- [x] **Step 3: Run the red tests**

Run: node --test test/*.test.mjs.

Expected before implementation: missing normalize-input and run-stats modules.

### Task 2: Implement the mapping boundary

**Files:**
- Create: actors/cross-platform-mobile-feedback/src/input/normalize-input.js
- Create: actors/cross-platform-mobile-feedback/src/runtime/run-stats.js

- [x] **Step 1: Normalize IDs and URLs**

Use explicit IDs first, parse only when needed, preserve supplied URLs, and emit the required platform-specific error codes.

- [x] **Step 2: Validate cross-product uniqueness and mode requirements**

Reject duplicate platform app IDs across product IDs and require both mappings for comparePlatforms/releaseComparison.

- [x] **Step 3: Normalize release, filter, analysis, comparison, aggregation, and date settings**

Return bounded deterministic values while preserving nullable release/date metadata.

### Task 3: Package the Actor skeleton

**Files:**
- Create: actors/cross-platform-mobile-feedback/src/main.js
- Create: actors/cross-platform-mobile-feedback/.actor/actor.json
- Create: actors/cross-platform-mobile-feedback/.actor/input_schema.json
- Create: actors/cross-platform-mobile-feedback/.actor/output_schema.json
- Create: actors/cross-platform-mobile-feedback/.actor/dataset_schema.json
- Create: actors/cross-platform-mobile-feedback/Dockerfile
- Create: actors/cross-platform-mobile-feedback/package.json
- Create: actors/cross-platform-mobile-feedback/package-lock.json
- Create: actors/cross-platform-mobile-feedback/README.md
- Create: actors/cross-platform-mobile-feedback/sample-input.json
- Create: actors/cross-platform-mobile-feedback/sample-benchmark.json

- [x] **Step 1: Store normalized input and run stats**

Keep the valid skeleton run non-collecting and write NORMALIZED_INPUT plus RUN_STATS.

- [x] **Step 2: Add Docker packaging coverage**

Assert the vendored comparison package is copied before npm install.

- [x] **Step 3: Run Actor checks**

Run: npm run lint, npm run format:check, node --test test/*.test.mjs, apify validate-schema, and a local apify run with temporary INPUT.json storage.

Expected: all checks pass; normalized input is stored; zero collection is explicit.
