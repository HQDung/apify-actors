# Phase 10 Plan — Google Play Shared Analysis

**Goal:** Run the shared feedback-analysis core against validated Google Play normalized records without adding Google Play-specific analysis logic.

**Tasks:**

- Define a Google Play taxonomy for app feedback types and common topics.
- Add a Google Play adapter for core analysis input/output while preserving raw and normalized records.
- Keep provider invocation optional; default to deterministic fallback analysis when no provider is configured.
- Record analysis status, confidence, error codes, usage counters, and output language.
- Add unit tests for provider success, malformed output, retry/fallback, and 1–5 star sentiment alignment.
- Update README, schemas, sample input, benchmark notes, and changelog together.

**Gate:** Google Play review records are analyzed through the shared core API, with no Steam-specific imports or duplicated analysis engine.
