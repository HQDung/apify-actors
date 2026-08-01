# Phase 13 benchmark report

## Operational matrix

| Case                           | Package                      | Purpose                               | Result              |
| ------------------------------ | ---------------------------- | ------------------------------------- | ------------------- |
| Global large                   | `com.google.android.youtube` | Large/global public Store page        | 3 reviews, HTTP 200 |
| Subscription/productivity      | `com.todoist`                | Subscription-oriented app sample      | 3 reviews, HTTP 200 |
| Vietnam-focused                | `com.zing.zalo`              | Vietnamese market and locale coverage | 3 reviews, HTTP 200 |
| Subscription/audio             | `com.spotify.music`          | Second subscription category          | 3 reviews, HTTP 200 |
| Mixed subscription/advertising | `com.duolingo`               | Mixed monetization study case         | 3 reviews, HTTP 200 |

Run input: [`sample-benchmark.json`](../sample-benchmark.json), English/US, `maxReviewsPerApp: 3`, deterministic shared fallback enabled, aggregation enabled.

## Measurements

- App requests: 5 requested, 5 processed, 0 errors.
- Review records: 15; analysis records: 15; analysis failures: 0.
- Source diagnostics: 5, all HTTP 200; parsed review cards: 15.
- Dataset records: 25 total, including 15 reviews, 5 diagnostics, and 5 product reports.
- Public response bytes: 6,563,254 total.
- Runtime: 1,889 ms on the local macOS development environment.
- Reported process RSS: 209,715,200 bytes.

## Coverage and interpretation

The redacted fixture corpus covers six locale/app cases with 18 review-shaped records, including English and Vietnamese date/rating parsing and optional developer replies. It is suitable for structural and provenance regression checks, but the committed fixtures intentionally omit review text.

No feedback-type accuracy, topic accuracy, severity reasonableness, summary faithfulness, false-bug rate, or cluster-coherence percentage is claimed. Those metrics require independently labeled review text; the current public HTML path exposes only a small sample and the external analysis provider is not configured.
