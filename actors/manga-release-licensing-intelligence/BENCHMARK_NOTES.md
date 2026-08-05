# Benchmark notes

Benchmarking is intentionally deferred until the Actor has completed the source adapters and the Phase 11 quality gate. The Phase 0 title matrix and sanitized source observations remain under the parent project `tests/fixtures/source-responses/` directory.

The runnable default contract is one `One Piece` / `US-en` lookup with no retailer collection, no proxy, and no secret. The local Phase 10 evidence run produced one matched snapshot, a non-empty dataset, `RUN_SUMMARY`, and `CHANGE_REPORT` in 6 seconds; `npm test` passed 49 tests and all three Actor schemas validated. Future benchmark runs must record runtime, dataset count, source failures, match status, and whether the output schemas validate. No benchmark result is a publication or pricing decision.
