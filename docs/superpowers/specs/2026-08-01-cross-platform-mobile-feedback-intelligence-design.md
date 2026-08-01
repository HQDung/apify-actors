# Cross-Platform Mobile App Feedback Intelligence Design

**Status:** Approved for execution from the project handoff.

**Goal:** Extend the existing feedback-analysis core and Google Play source capability with an explicitly mapped Apple App Store source and a source-neutral cross-platform comparison Actor.

**Architecture:** Source adapters collect and normalize reviews independently. The shared analysis core classifies reviews and creates platform-scoped clusters; a new comparison core matches only compatible clusters within one explicit product identity and emits cautious shared/platform-specific findings. The Apify Actor owns input validation, collection orchestration, dataset/key-value output, partial-failure handling, and operational statistics.

**Scope:** Implement the handoff’s MVP modes (`rawReviews`, `feedbackAnalysis`, `comparePlatforms`, and `releaseComparison`), English/Vietnamese support, country/language/version dimensions, release-window warnings, schemas, benchmarks, README, and publish-readiness validation. Do not add automatic app matching, private sources, ticket creation, competitive discovery, pricing changes, or automatic publication.

**Phase gates:** Each phase must end with tests, documentation, an acceptance report, and an isolated Git checkpoint. No comparison implementation proceeds until Phase 0 confirms the source prerequisites or documents and resolves their blockers.

**Current prerequisite finding:** The repository currently contains `actors/google-play-feedback-analyzer` and `packages/feedback-analysis-core`, but no Apple App Store source Actor. Therefore Phase 0 can validate the existing core and Google source, while Apple collection and its regression contract remain a blocking prerequisite for cross-platform comparison.

**Verification:** Use the repository’s Node test suites and `apify validate-schema` for Actor schemas. Cloud commands remain separately authorized; this execution does not publish automatically or change pricing.
