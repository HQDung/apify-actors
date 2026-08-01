# Phase 11 report — quality benchmark

Date: 2026-08-01

## Result

Phase 11 is complete. A deterministic 100-review benchmark now exercises the full analysis, platform clustering, comparison, dimension, and release-report path.

## Benchmark fixture

- 50 Google Play and 50 Apple App Store reviews.
- 25 known shared review pairs, including 10 feature-request pairs.
- 50 labeled platform-specific examples.
- Mixed English and Vietnamese metadata across US and VN.
- Separate Android/iOS release dates with before/after windows.
- Fixture provider usage: 12,000 input tokens, 8,000 output tokens, estimated cost $0.02 for one product comparison.

## Results

| Metric | Result |
| --- | ---: |
| Analysis schema validity | 100% |
| Platform cluster coherence | 100% |
| Shared-cluster precision | 100% |
| Shared-cluster recall | 100% |
| Platform-specific false-positive rate | 0% |
| Rating/country/language/version accuracy | 100% |
| Release-window accuracy | 100% |
| Cross-product matches | 0 |
| Fixture runtime | approximately 15 ms |
| Fixture peak RSS | approximately 50 MB |

## Verification

- `npm run benchmark:quality`: passed.
- Cross-platform Actor tests: 32 passed.
- Cross-platform Actor lint and formatting: passed.
- Apify input schema validation: passed.
- JSON artifact parsing and `git diff --check`: passed.
- Feedback-analysis core tests: 10 passed.
- Comparison-core contract tests: 7 passed.
- Source-adapter tests: 4 passed.

The fixture is a reproducible quality benchmark, not live store coverage. The local source smoke is network-dependent and recorded fetch failures as structured errors; a cloud/network-enabled run remains an operational publish-readiness check.

No pricing or publication action was performed.

## Gate

Phase 11 acceptance criteria are met for fixture quality. Phase 12 may begin: finalize README and Store preparation with conservative coverage, cost, and responsible-use language.
