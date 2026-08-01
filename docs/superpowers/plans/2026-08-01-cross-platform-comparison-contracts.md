# Cross-Platform Comparison Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define source-neutral, validated contracts for explicit product mappings, cross-platform comparisons, and partial-data reports.

**Architecture:** A dependency-free JavaScript package exposes constants, deterministic comparison-ID generation, and validators. It accepts the current Google/Apple normalized source shape only through explicit product mappings and does not know about Apify or source collection.

**Tech Stack:** JavaScript ES modules, Node built-in test runner.

---

### Task 1: Test the contract boundary first

**Files:**
- Create: packages/cross-platform-comparison-core/test/contracts.test.js

- [x] **Step 1: Test canonical IDs and product mappings**

Cover both platform IDs, one-platform mappings, required-both validation, and stable product ID syntax.

- [x] **Step 2: Test comparison record evidence rules**

Cover shared findings requiring both cluster IDs and platform-specific findings requiring cautious sample wording and evidence status.

- [x] **Step 3: Test partial report warnings**

Cover zero-review platforms requiring an explicit INSUFFICIENT_CROSS_PLATFORM_DATA warning.

- [x] **Step 4: Run the red test**

Run: node --test packages/cross-platform-comparison-core/test/contracts.test.js

Expected before implementation: module-resolution failure for the missing package entry point.

### Task 2: Implement the dependency-free comparison package

**Files:**
- Create: packages/cross-platform-comparison-core/package.json
- Create: packages/cross-platform-comparison-core/src/contracts.js
- Create: packages/cross-platform-comparison-core/src/index.js

- [x] **Step 1: Add canonical constants and identity validation**

Expose PLATFORM_IDS, COMPARISON_CLASSIFICATIONS, and validateProductMapping with optional requireBothPlatforms.

- [x] **Step 2: Add issue validators and stable IDs**

Validate shared and platform-specific evidence fields and normalize comparison IDs from product/classification/issue text.

- [x] **Step 3: Add comparison and report validators**

Ensure comparisons use both explicit product mappings, reports retain nullable statistics, and missing source data creates scoped warnings.

### Task 3: Document and verify the contract

**Files:**
- Create: docs/CROSS_PLATFORM_CONTRACT.md
- Modify: package.json

- [x] **Step 1: Document field names and source compatibility**

Explain canonical IDs, user-facing Android/iOS labels, evidence rules, report statistics, and the absence-of-evidence distinction.

- [x] **Step 2: Add the repository test command**

Add test:comparison-core to the root scripts without adding dependencies.

- [x] **Step 3: Run the phase checks**

Run: node --test packages/cross-platform-comparison-core/test/contracts.test.js, npm run test:core, and git diff --check.

Expected: 7 comparison tests pass, 10 shared-core tests pass, and no whitespace errors.
