# Cross-Platform Implementation Risks

**Date:** 2026-08-01

## Blocking risks

| Risk | Why it blocks | Exit criterion |
| --- | --- | --- |
| Apple App Store source is absent | There is no second source to collect, normalize, or regression-test | Add an Apple source Actor/client with schema, fixtures, normalized adapter, partial-failure behavior, and a green regression suite |
| No cross-platform source contract | The current Google contract uses `source.platform` and platform IDs as product IDs; the handoff requires explicit product mapping | Approve and test Phase 1 contracts for product identity, platform identity, review envelope, cluster records, comparison records, and warnings |
| No bilingual Apple evidence | English/Vietnamese compatibility cannot be assessed across both stores | Add representative English and Vietnamese Apple fixtures and contract tests |

## High risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Current deterministic fallback has no actionable topic/issue extraction | Comparison matching and quality targets cannot rely on fallback output alone | Keep raw output, add a tested provider boundary/cache, and disclose fallback limitations until meaningful analysis fixtures exist |
| Store data coverage differs by country, language, ordering, and rate limits | Platform-specific findings can be sample artifacts | Include collection diagnostics, sample-size thresholds, and cautious “observed only in collected sample” wording |
| App version metadata is often missing | Release comparisons may appear precise while lacking version attribution | Preserve nulls, use date windows independently per platform, and emit insufficient-data warnings |
| Generic repository validator is template-specific | A green/failed result from it would misrepresent Actor validity | Use the Actor’s own `apify validate-schema`, unit tests, and targeted packaging checks |
| Cloud API is unreachable in the current environment | Cloud smoke and publication evidence cannot be generated here | Keep cloud work gated and separately authorized; do not claim cloud readiness from local runs |

## Quality risks

- Generic negative sentiment must never be a cluster-match signal by itself.
- A bug report and a feature request must not match solely because they share a topic such as login or payment.
- Platform-specific classifications need minimum mention and sample-size thresholds and must not be worded as proof that the other platform has no such issue.
- Product identity must be explicit; package IDs and Apple numeric IDs cannot be compared across products without the user’s mapping.
- Release impact must remain observational and must account for staggered Android/iOS dates.

## Deferred work after Phase 0

1. Build and validate the Apple App Store source prerequisite.
2. Define Phase 1 comparison contracts around the actual source capabilities.
3. Only then implement the comparison Actor and matching/aggregation layers.

No production comparison code is authorized by this phase report.
