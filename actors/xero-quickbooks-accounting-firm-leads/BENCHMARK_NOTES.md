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

## London combined-source cloud validation — 2026-07-23

Cloud run [`69Z2OoEdbKnJLDpcE`](https://console.apify.com/view/runs/69Z2OoEdbKnJLDpcE) used build `0.1.2` with London, both sources, historical observed input `maxResults: 10`, proxy disabled, and website enrichment and contact extraction disabled. It succeeded with exit code 0.

| Metric              |    Value |
| ------------------- | -------: |
| Search jobs         |        2 |
| Directory items     |       15 |
| Profiles fetched    |       15 |
| Unique firms        |       14 |
| Results pushed      |       10 |
| Duplicate merges    |        1 |
| Source failures     |        0 |
| Website enrichments |        0 |
| Runtime             |     59 s |
| Cost                |   $0.014 |
| Average CPU         |   44.53% |
| Maximum CPU         |  133.63% |
| Average memory      | 401.6 MB |
| Maximum memory      | 844.9 MB |
| Dataset size        |   6.6 kB |

Dataset quality: UK location 10/10, services 10/10, industries 10/10, website 8/10, email 1/10, phone 0/10, and average completeness 68.5. Output distribution was QuickBooks 9 and Xero 1. This historical low-cap run shows source-order capping; new combined-source validations must use `maxResults` of at least 14, and lower combined values are automatically normalized to 14.

### Current blockers

- Xero's London page exposes five featured advisors, while its advertised full-results route currently returns 404.
- QuickBooks requires a browser and currently reads only the first rendered result page; its public GraphQL response exposes cursor pagination that is not yet implemented.
- An earlier separate local combined run on 2026-07-22, after several rapid live validations, returned QuickBooks search cards but nine profile shells timed out despite HTTP 200. The independent QuickBooks run immediately before it fetched all 10 profiles. Treat this as an upstream rendering/rate transient; no automatic retries were added to avoid increasing request pressure. It was not reproduced in the successful 2026-07-23 cloud run above.
- A low combined-source cap can favor the first source in processing order. The combined-source minimum normalization prevents configured values below 14 from reproducing that behavior.
- Website enrichment is not implemented, so its input flag currently leaves directory-only output.

## Planned benchmarks

Planned benchmark inputs:

1. London, both sources, 20 results, website enrichment disabled.
2. New York, QuickBooks, 20 results, website enrichment disabled.
3. Sydney and Singapore, both sources, 50 results, website enrichment disabled.

Record runtime, compute cost, leads found, unique leads, merge count, website success rate, email rate, contact rate, and source failure rate. Validate the Actor before any benchmark. Do not publish or change pricing automatically.
