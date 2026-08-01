# Phase 2 Plan — Shared-Core Package Skeleton

**Goal:** Create a source-neutral package that compiles and validates its public
contracts without importing Apify or either source adapter.

**Files:**

- Create: `packages/feedback-analysis-core/package.json`
- Create: `packages/feedback-analysis-core/src/contracts/*.js`
- Create: `packages/feedback-analysis-core/src/taxonomy/*.js`
- Create: `packages/feedback-analysis-core/src/errors/*.js`
- Create: `packages/feedback-analysis-core/src/index.js`
- Create: `packages/feedback-analysis-core/test/core-contracts.test.js`
- Modify: root `package.json` with `test:core`

**Verification:**

1. Write a failing import/contract test.
2. Implement minimal contract validators and taxonomy configuration.
3. Run `npm run test:core` and `node --check` over all package source files.
4. Scan package source for `apify`, Steam, or Google Play imports/terms.
5. Run the existing Steam regression suite to prove no Actor import changed.

**Acceptance gate:** The package exports only source-neutral contracts/configuration,
its tests pass independently, and the Steam package remains untouched.
