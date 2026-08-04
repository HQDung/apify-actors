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

Phase 12 release-impact smoke on 2026-08-01:

- 1 app, 1 language, and 1 country request; 3 reviews and 1 source diagnostic emitted.
- The report used a 2026-06-01 release boundary with 14 days before and 30 days after; 0 before reviews and 1 after review were observed in the bounded public sample.
- 1 `productFeedbackReport` and 1 `feedbackImpactReport` emitted; `totalRecords: 6`, `aggregationRecords: 2`, `reportsStored: 1`, `impactReportsStored: 1`, and 0 errors.
- HTTP 200; 1,291,510 response bytes; runtime 684 ms on the local macOS development environment.
- The impact report was written to `APP_RELEASE_IMPACT_com_todoist` and included structured `NO_REVIEWS`/`LIMITED_DATA` warnings.

Phase 13 five-app benchmark matrix on 2026-08-01:

- Matrix: `com.google.android.youtube` (global-large), `com.todoist` (subscription/productivity), `com.zing.zalo` (Vietnam-focused), `com.spotify.music` (subscription/audio), and `com.duolingo` (mixed subscription/advertising study case).
- 5/5 app requests succeeded; 15 reviews, 15 analysis objects, 5 diagnostics, and 5 aggregate reports were emitted.
- 0 collection errors and 0 analysis failures; 25 total dataset records (`collectionRecords: 20`, `aggregationRecords: 5`).
- Total public response bytes: 6,563,254; runtime: 1,889 ms; reported process RSS: 209,715,200 bytes.
- The benchmark measures operational behavior and deterministic fallback execution. It does not claim feedback-type/topic accuracy because no independent manual labels or external analysis provider were configured.

Phase 14 schema-readiness validation on 2026-08-01:

- Input, output, dataset, and all three sample JSON files parsed successfully.
- Apify input-schema validation passed; dataset views present: `overview`, `reviews`, `clusters`, `reports`, and `releaseImpact`.
- No runtime behavior or pricing configuration changed in this phase.

Phase 15 documentation validation on 2026-08-01:

- README, Actor metadata, sample inputs, schemas, benchmark notes, and changelog were reconciled.
- Store copy explicitly distinguishes source facts from analysis, states bounded coverage, and includes responsible-use and non-causal release-impact language.

Phase 16 final readiness smoke on 2026-08-01:

- Standard sample: 1 app, 3 reviews, 1 diagnostic, 1 aggregate report, 0 errors, 5 dataset records, `analysisRecords: 3`, `analysisFailures: 0`, and `reportsStored: 1`.
- Runtime: 675 ms; reported process RSS: 176,832,512 bytes.
- Google Play tests: 26 passing; shared-core tests: 10 passing; Steam regression tests: 8 passing and 1 intentionally skipped network smoke; core packaging test: 1 passing.
- Actor-specific input-schema validation and all JSON/schema parsing checks passed. The repository’s generic validator was not applicable because it requires template-only `src/niche-config.js` and generated storage input files.

Phase 17 cloud publication validation on 2026-08-01:

- The first cloud build exposed a Docker packaging defect: `npm install` ran before the vendored shared-core tarball was copied into the image. The Dockerfile now copies `vendor/` before installation, protected by `test/dockerfile-packaging.test.mjs`.
- Corrected build `0.1.4` (`qDDyrL6aqpJSb60wt`) succeeded and applied the `latest` tag.
- Standard cloud run `u3DE4YOavfTTeFn8B` succeeded with 3 reviews, 1 diagnostic, 3 analyses, 1 aggregate report, 5 dataset records, 0 errors, and 1 stored report.
- Release-impact cloud run `QfXj9MrzKEp1NwEAe` succeeded with 3 reviews, 1 diagnostic, 3 analyses, 1 aggregate report, 1 impact report, 6 dataset records, 0 errors, and 1 stored impact report.
- After both runs passed, the Actor was published publicly under `AI` and `BUSINESS`. No pricing fields were changed.

Store default-input validation on 2026-08-02:

- Root cause: `appIds` was required but had no schema default, so the Store automation’s empty/default input was rejected before Actor startup.
- Added the bounded schema default `appIds: ["com.todoist"]`; the standard sample now explicitly includes `mode: "reviews"` and the same valid package ID.
- The default-only input is covered by `test/default-input.test.mjs` and is expected to run through the normal review path without manual input.

Public Store response size and review ordering are time-sensitive; benchmark results are evidence for the collector contract, not a pricing commitment.
