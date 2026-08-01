# Benchmark notes

## Phase 8 baseline

The Phase 8 smoke target was `com.todoist` with `maxReviewsPerApp: 5`, HTTP-only collection, and no AI analysis. The Phase 9 smoke target uses `maxReviewsPerApp: 3` and additionally checks `normalizedFeedback` on each review. The Phase 10 target keeps shared deterministic analysis enabled with English output.

Observed local run on 2026-08-01:

- 1 app requested and processed.
- 3 review records emitted; the public HTML contained 3 unique cards, below the cap of 5.
- 1 source diagnostic emitted; HTTP 200 and 1,291,779 response bytes.
- 0 errors; 4 total dataset records.
- Runtime: 591 ms on the local macOS development environment.

Phase 9 normalized smoke on 2026-08-01:

- 1 app requested and processed; 3 review records and 1 diagnostic emitted.
- HTTP 200; 1,290,633 response bytes; 3 parsed cards.
- Every review record carried a core-validated `normalizedFeedback` object.
- 0 errors; 4 total dataset records; runtime 568 ms.
- Phase 10 adds one shared-core analysis object per review; no external provider is configured.

Phase 10 analysis smoke on 2026-08-01:

- 1 app requested and processed; 3 reviews, 3 shared-core analysis objects, and 1 diagnostic emitted.
- HTTP 200; 1,290,655 response bytes; 0 errors; 4 total records.
- All three analyses used `deterministic-fallback` from `feedback-core-v1`; runtime 444 ms.

Phase 11 aggregation smoke on 2026-08-01:

- 1 app requested and processed; 3 reviews, 1 source diagnostic, and 1 `productFeedbackReport` emitted.
- The default deterministic fallback produced no actionable clusters; `aggregationRecords` was 1 and `reportsStored` was 1.
- 0 errors; 5 total dataset records (`collectionRecords: 4`, `aggregationRecords: 1`); the per-app report was written to `APP_REPORT_com_todoist`.
- HTTP 200; 1,291,776 response bytes; runtime 565 ms on the local macOS development environment.

This Actor is not published automatically. Public Store response size and review ordering are time-sensitive; benchmark results are evidence for the collector contract, not a pricing commitment.
