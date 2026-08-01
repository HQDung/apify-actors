# Benchmark notes

## Phase 8 baseline

The Phase 8 smoke target is `com.todoist` with `maxReviewsPerApp: 5`, HTTP-only collection, and no AI analysis. The expected output is one review record per parsed card plus one `sourceDiagnostic` record.

Observed local run on 2026-08-01:

- 1 app requested and processed.
- 3 review records emitted; the public HTML contained 3 unique cards, below the cap of 5.
- 1 source diagnostic emitted; HTTP 200 and 1,291,779 response bytes.
- 0 errors; 4 total dataset records.
- Runtime: 591 ms on the local macOS development environment.

This Actor is not published automatically. Public Store response size and review ordering are time-sensitive; benchmark results are evidence for the collector contract, not a pricing commitment.
