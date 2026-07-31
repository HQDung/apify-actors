# Benchmark notes

## Global directory contract implementation — 2026-07-31

The actor now accepts 1–20 normalized locations, preserves the requested `maxResults` cap, interleaves source/location jobs before capping, retries transient directory failures, and paginates rendered QuickBooks results when a public next control is available. Unit and fixture coverage is green; no cloud benchmark or publication was performed in this phase.

Planned initial live matrix: London (GB), New York (US), Sydney (AU), and Singapore (SG), each with Xero-only, QuickBooks-only, and combined directory-only inputs. Record search jobs, directory items, profiles fetched, unique firms, merge reasons, source failures, retry counts, runtime, cost, and completeness.

## London live-source validation — 2026-07-22

Input per run: London, United Kingdom, one source, maximum 10 results, proxy disabled, directory-only mode, and contact extraction disabled.

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

Cloud run [`69Z2OoEdbKnJLDpcE`](https://console.apify.com/view/runs/69Z2OoEdbKnJLDpcE) used build `0.1.2` with London, United Kingdom, both sources, historical observed input `maxResults: 10`, proxy disabled, directory-only mode, and contact extraction disabled. It succeeded with exit code 0.

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

## London directory-only contract smoke — 2026-07-23

The isolated local Actor run used the public sample input, which now omits both `locations` and `enrichWebsites`. The runtime canonicalized the effective input to London, United Kingdom, both sources, `maxResults: 14`, directory-only mode, and contact extraction disabled. It produced one summary output with 2 search jobs, 15 directory items, 5 profiles fetched, 5 unique firms, and 5 pushed results. Xero completed with 0 failures; QuickBooks returned 10 search cards but all 10 profile-page waits timed out; website enrichment remained 0. This confirms the public-contract change and reproduces the intermittent QuickBooks profile-rendering blocker.

### Current blockers

- Xero's London page exposes five featured advisors, while its advertised full-results route currently returns 404.
- QuickBooks requires a browser and may return transient profile-rendering timeouts despite HTTP 200. Navigation and selector operations now have explicit deadlines and bounded retries; live stability still requires the planned cloud matrix.
- QuickBooks rendered pagination is implemented when a public next control is available and stops on exhaustion or repeated cards. Internal GraphQL cursor behavior is not used.
- Source/location jobs are interleaved before final capping, so a low `maxResults` value no longer favors the first source in processing order.
- Website enrichment is unavailable by contract; the public input schema exposes directory-only mode and rejects `enrichWebsites: true`.

## Planned benchmarks

Planned benchmark inputs:

1. London, United Kingdom, both sources, 14 results, directory-only mode.
2. London, United Kingdom, Xero only, 10 results, directory-only mode.
3. London, United Kingdom, QuickBooks only, 10 results, directory-only mode.

Record runtime, compute cost, leads found, unique leads, merge count, website success rate, email rate, contact rate, and source failure rate. Validate the Actor before any benchmark. Do not publish or change pricing automatically.
