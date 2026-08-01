# Cross-Platform Implementation Risks

**Date:** 2026-08-01

## Blocking risks

| Risk | Why it blocks | Exit criterion |
| --- | --- | --- |
| Apple public-feed coverage is environment-limited | The source Actor is implemented and fixture-tested, but the current sandbox cannot complete a live Apple feed request | Run an authorized cloud smoke with a real app ID before publishing any Apple coverage claim |
| Cross-platform contract drift | The source adapters and comparison Actor now depend on the Phase 1 contract; later analysis fields must not silently change the normalized identity model | Keep contract tests in the phase gate and reject incompatible report records |
| Apple reviewer-language attribution is unavailable in the public feed | The requested locale is not guaranteed to be the reviewer’s original language | Preserve the requested locale as a collection dimension, use `unknown` when source language is absent, and disclose the limitation |

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

## Deferred work after Phase 3

1. Run an authorized cloud Apple smoke with a real app ID before Store claims.
2. Implement shared analysis, issue extraction, and platform clustering with fixture-backed quality tests.
3. Only then implement comparison matching, aggregation, and release-window reporting.

No production comparison code is authorized by this phase report.
