# Phase 17 report — Authorized cloud publication

## Result

Phase 17 is complete. The Google Play Reviews & App Feedback Analyzer built successfully in Apify Cloud, passed both cloud examples, and was published publicly after explicit authorization. Pricing was not changed.

## Deployment evidence

- Actor: `obliging_persimmon_cki/google-play-feedback-analyzer`
- Actor ID: `YcNcvBgaXZKcvWTFq`
- Public Actor URL: https://apify.com/obliging_persimmon_cki/google-play-feedback-analyzer
- Build: `0.1.4`, tag `latest`, build ID `qDDyrL6aqpJSb60wt`
- Build URL: https://console.apify.com/actors/YcNcvBgaXZKcvWTFq#/builds/0.1.4
- Store categories: `AI`, `BUSINESS`
- Pricing: unchanged; no pricing fields were included in the publication update.

## Cloud checks

### Standard sample

- Run ID: `u3DE4YOavfTTeFn8B`
- Result: succeeded
- Output: 3 reviews, 1 diagnostic, 3 analyses, 1 aggregate report, 5 dataset records, 0 errors.
- Run URL: https://console.apify.com/actors/YcNcvBgaXZKcvWTFq/runs/u3DE4YOavfTTeFn8B

### Release-impact sample

- Run ID: `QfXj9MrzKEp1NwEAe`
- Result: succeeded
- Output: 3 reviews, 1 diagnostic, 3 analyses, 1 aggregate report, 1 impact report, 6 dataset records, 0 errors.
- Run URL: https://console.apify.com/actors/YcNcvBgaXZKcvWTFq/runs/QfXj9MrzKEp1NwEAe

## Cloud artifact verification

- Standard dataset `rIuaK3JKI3U6AQgiF`: 5 records with `review`, `sourceDiagnostic`, and `productFeedbackReport` types.
- Standard key-value store `w3Hu6z1nPmI6XzdGf`: `APP_REPORT_com_todoist` and `RUN_STATS` present.
- Release-impact dataset `UjM0tdrrPGGroV71J`: 6 records including `feedbackImpactReport`.
- Release-impact key-value store `7CzpyJCUIhQlct7bf`: `APP_REPORT_com_todoist`, `APP_RELEASE_IMPACT_com_todoist`, and `RUN_STATS` present.

## Defect fixed during publication validation

The original cloud build failed because `Dockerfile` invoked `npm install` before copying the local `vendor/project-feedback-analysis-core-1.0.0.tgz` dependency into the image. The Dockerfile now copies `vendor/` before installation, and `test/dockerfile-packaging.test.mjs` prevents regression.

## Verification

- Google Play test suite: 27 passing.
- Lint: passing.
- Input schema validation: passing.
- Corrected cloud build: succeeded.
- Standard cloud run: succeeded.
- Release-impact cloud run: succeeded.

No further implementation phase is planned. Browser expansion, external-provider analysis, and new source adapters remain deferred.
