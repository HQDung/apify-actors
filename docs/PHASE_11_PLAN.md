# Phase 11 Plan — Google Play Clustering and Aggregation

**Goal:** Add shared-core clustering, aggregation, and window comparison to Google Play analyzed records without duplicating Steam algorithms.

**Tasks:**

- Map Google Play analysis results into the core clustering input contract.
- Emit stable cluster records with app/package partitioning and representative review IDs.
- Emit per-app aggregate reports with sentiment, rating, topic, and localization statistics.
- Add optional before/after windows using normalized creation dates and explicit comparison diagnostics.
- Add tests for empty analyses, mixed ratings, duplicate issue titles, and multi-app isolation.
- Update README, schemas, sample input, benchmark notes, and changelog together.

**Gate:** Clusters and aggregate reports validate through shared core contracts and do not alter existing Steam regression outputs.
