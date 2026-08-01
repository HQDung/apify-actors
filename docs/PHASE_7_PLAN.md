# Phase 7 Plan — Google Play Technical Spike

**Goal:** Select and document a stable public Google Play review collection path
before building the new Actor.

**Tasks:**

- Choose a collection method that works without AI analysis and record its
  pagination, locale, country, rating, date, version, review ID, edit, reply,
  and rate-limit behavior.
- Test a large global app, a smaller app, and an app with Vietnamese reviews
  across US English, Vietnam Vietnamese, and multiple countries.
- Save redacted-safe raw response fixtures under
  `actors/google-play-feedback-analyzer/tests/fixtures/raw/`.
- Add a source-specific error/limitation table and recommendation in
  `actors/google-play-feedback-analyzer/docs/TECHNICAL_SPIKE.md`.

**Gate:** Collection fixtures and limitations are documented; no shared analysis
or new Actor production code is added until the source method is selected.
