# Phase 4 Plan — Shared Review Analysis Engine

**Goal:** Move source-independent review analysis into the core while preserving
Steam prompts, taxonomy IDs, partial failures, and raw records.

**Core files:**

- Create `packages/feedback-analysis-core/src/analysis/analyze-feedback.js`
- Create `packages/feedback-analysis-core/src/analysis/provider.js`
- Create `packages/feedback-analysis-core/src/analysis/parse-analysis.js`
- Create `packages/feedback-analysis-core/src/analysis/fallback-analysis.js`
- Create `packages/feedback-analysis-core/src/analysis/usage.js`
- Export only `analyzeFeedback` and required provider/config types from `src/index.js`

**Actor files:**

- Adapt `src/analysis/analyze-review.js` to call the core engine with Steam
  taxonomy and the existing deterministic fallback.
- Keep source metadata/context in the Steam adapter.
- Keep Actor logging/secrets injection outside the core.

**Tests:**

- Write failing core tests for provider success, invalid JSON retry/fallback,
  injected logger, output language, and usage totals.
- Add Steam contract tests for unchanged result fields and raw review survival.
- Run core/Steam/regression/schema/lint/build gates before the phase report.
