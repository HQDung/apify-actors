# Benchmark notes

## London live-source validation — 2026-07-22

Input per run: London, one source, maximum 10 results, proxy disabled, website enrichment and contact extraction disabled.

| Metric           | Xero | QuickBooks |
| ---------------- | ---: | ---------: |
| Search jobs      |    1 |          1 |
| Directory items  |    5 |         10 |
| Profiles fetched |    5 |         10 |
| Unique firms     |    5 |          9 |
| Results pushed   |    5 |          9 |
| Duplicate merges |    0 |          1 |
| Source failures  |    0 |          0 |

Xero returned normalized UK profiles with services and industries. QuickBooks returned normalized GB addresses and merged two advisor profiles belonging to one firm. Contacts remained empty because extraction was disabled. These were correctness validations, not cost benchmarks.

### Current blockers

- Xero's London page exposes five featured advisors, while its advertised full-results route currently returns 404.
- QuickBooks requires a browser and currently reads only the first rendered result page; its public GraphQL response exposes cursor pagination that is not yet implemented.
- A later combined-source run, after several rapid live validations, still returned QuickBooks search cards but nine profile shells timed out despite HTTP 200. The independent QuickBooks run immediately before it fetched all 10 profiles. Treat this as an upstream rendering/rate transient; no automatic retries were added to avoid increasing request pressure.
- Website enrichment is not implemented, so its input flag currently leaves directory-only output.

## Planned benchmarks

Planned benchmark inputs:

1. London, both sources, 20 results, website enrichment disabled.
2. New York, QuickBooks, 20 results, website enrichment disabled.
3. Sydney and Singapore, both sources, 50 results, website enrichment disabled.

Record runtime, compute cost, leads found, unique leads, merge count, website success rate, email rate, contact rate, and source failure rate. Validate the Actor before any benchmark. Do not publish or change pricing automatically.
