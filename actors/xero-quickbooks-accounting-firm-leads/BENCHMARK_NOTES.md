# Benchmark notes

## Global directory contract implementation — 2026-07-31

The actor now accepts 1–20 normalized locations, preserves the requested `maxResults` cap, interleaves source/location jobs before capping, retries transient directory failures, and paginates rendered QuickBooks results when a public next control is available. Unit and fixture coverage is green; the completed cloud gate is recorded below.

Initial live matrix: London (GB), New York (US), Sydney (AU), and Singapore (SG), each with Xero-only, QuickBooks-only, and combined directory-only inputs. The completed gate records search jobs, directory items, profiles fetched, unique firms, merge reasons, source failures, retry counts, runtime, cost, and completeness.

## Reliability-gate implementation — 2026-07-31

The reliability gate now includes `validation/global-matrix-inputs.json` and the serial `validation/run-global-matrix.mjs` runner. It executes eight single-source cases, four combined cases, and three QuickBooks London soak cases with `maxResults: 5`, directory-only options, contacts/raw data disabled, and proxy disabled. The runner emits machine-readable JSON and does not update this file automatically.

QuickBooks profile retrieval now retries the complete navigation, rendered-profile wait, and extraction transaction as one bounded operation. A retry closes and recreates the page; deterministic 4xx/profile-not-found failures stop immediately. When the public profile remains unavailable, search-card fields are retained as a marked partial profile. `OUTPUT` and source diagnostics expose per-source `retryAttempts`, `paginationPages`, and partial-profile counts. The completed gate used directory-only inputs; website enrichment is now an opt-in bounded phase.

Local gate command:

```bash
node validation/run-global-matrix.mjs --mode local
```

Cloud gate command after a private build push (never public publishing):

```bash
node validation/run-global-matrix.mjs --mode cloud
```

Record each case's runtime, run ID (cloud), `resultClass` (`usable_results`, `no_public_results`, `source_failure`, or `profile_failures`), search-job failures, directory items, profiles fetched, retries, rendered pages, duplicate domains, profile URL coverage, firm-name coverage, and completeness below once the gate is run.

## Global cloud validation gate — 2026-07-31

Build `0.1.6` completed all 15 serial matrix cases successfully. Inputs used five results per case, directory-only mode, contacts/raw data disabled, and proxy disabled. The gate generated 19 search jobs and all search jobs completed; no case was classified as `no_public_results` or `source_failure`.

Aggregate gate evidence: 95 directory cards, 89 profiles fetched, 83 fully rendered profiles, 6 marked partial profiles, 85 summed per-run unique firms, 69 summed pushed rows, 4 duplicate merges, 6 Xero profile-stage failures, 0 QuickBooks source failures, 11 rendered QuickBooks pagination pages, and 0 website enrichments. Fully rendered coverage was 87.4% of cards, above the 80% gate. The three Xero misses were one each in New York, Sydney, and Singapore; QuickBooks partials occurred in the Sydney case, combined Sydney case, and one London soak run. Combined outputs contained 9 Xero-only and 11 QuickBooks-only rows; no cross-source firm overlap appeared in those capped samples.

Total Actor runtime was 425.4 seconds across the cases, with total usage cost `$0.0995` (average `$0.0066` per case). All runs used build `0.1.6` and exited successfully.

| Case                     | Cloud run                                                                  | Results | Profiles | Unique | Failures | Retries | Partial | Runtime |    Cost |
| ------------------------ | -------------------------------------------------------------------------- | ------: | -------: | -----: | -------: | ------: | ------: | ------: | ------: |
| Xero London              | [VS0QpFdVAI1hmAQTH](https://console.apify.com/view/runs/VS0QpFdVAI1hmAQTH) |       5 |        5 |      5 |        0 |       0 |       0 |   35.8s | $0.0082 |
| Xero New York            | [iONf4w5gHbTFMiUTZ](https://console.apify.com/view/runs/iONf4w5gHbTFMiUTZ) |       4 |        4 |      4 |        1 |       0 |       0 |    7.6s | $0.0019 |
| Xero Sydney              | [Yu4cut4qjYc9byqXO](https://console.apify.com/view/runs/Yu4cut4qjYc9byqXO) |       4 |        4 |      4 |        1 |       0 |       0 |   30.1s | $0.0069 |
| Xero Singapore           | [r4orO6VIvMiV1GitR](https://console.apify.com/view/runs/r4orO6VIvMiV1GitR) |       4 |        4 |      4 |        1 |       0 |       0 |    8.6s | $0.0021 |
| QuickBooks London        | [iYfQoJQ3FwXheNho5](https://console.apify.com/view/runs/iYfQoJQ3FwXheNho5) |       4 |        5 |      4 |        0 |       0 |       0 |   10.4s | $0.0026 |
| QuickBooks New York      | [WjfehcpxZgiTKHuzT](https://console.apify.com/view/runs/WjfehcpxZgiTKHuzT) |       5 |        5 |      5 |        0 |       0 |       0 |   12.6s | $0.0031 |
| QuickBooks Sydney        | [lOey8e4L3K5MK9EzO](https://console.apify.com/view/runs/lOey8e4L3K5MK9EzO) |       5 |        5 |      5 |        0 |       0 |       1 |   11.9s | $0.0030 |
| QuickBooks Singapore     | [yDnb3nl6gyb4dprVR](https://console.apify.com/view/runs/yDnb3nl6gyb4dprVR) |       5 |        5 |      5 |        0 |       0 |       0 |   30.2s | $0.0070 |
| Combined London          | [AIJyXkgxuejU3tegK](https://console.apify.com/view/runs/AIJyXkgxuejU3tegK) |       5 |       10 |      9 |        0 |       0 |       0 |   53.7s | $0.0124 |
| Combined New York        | [qF99TXjcEuYR5FQhB](https://console.apify.com/view/runs/qF99TXjcEuYR5FQhB) |       5 |        9 |      9 |        1 |       0 |       0 |   24.0s | $0.0058 |
| Combined Sydney          | [znX4ZotnOUDTfuPS0](https://console.apify.com/view/runs/znX4ZotnOUDTfuPS0) |       5 |        9 |      9 |        1 |       0 |       1 |   25.5s | $0.0062 |
| Combined Singapore       | [UnvVeiksbmusb1bdS](https://console.apify.com/view/runs/UnvVeiksbmusb1bdS) |       5 |        9 |      9 |        1 |       0 |       0 |   25.4s | $0.0061 |
| QuickBooks London soak 1 | [aa5b6pT1sMXvfFW20](https://console.apify.com/view/runs/aa5b6pT1sMXvfFW20) |       4 |        5 |      4 |        0 |       0 |       0 |   13.0s | $0.0031 |
| QuickBooks London soak 2 | [4ZsXxBv5Yf4LncCGe](https://console.apify.com/view/runs/4ZsXxBv5Yf4LncCGe) |       4 |        5 |      4 |        0 |       0 |       0 |    9.5s | $0.0024 |
| QuickBooks London soak 3 | [GBwyx0OgOGNmdw4Gt](https://console.apify.com/view/runs/GBwyx0OgOGNmdw4Gt) |       5 |        5 |      5 |        0 |       8 |       4 |  127.1s | $0.0288 |

The representative combined London benchmark [Vkdhq94Kd4BmOSDdO](https://console.apify.com/view/runs/Vkdhq94Kd4BmOSDdO) used `maxResults: 14` and completed in 58.4s at `$0.0137`: 15 directory items, 15 profiles, 14 unique firms, 14 pushed rows, 1 domain merge, zero failures/retries, one QuickBooks pagination page, 8/14 websites, 1/14 emails, 0/14 phones, and average completeness 65. This is the primary benchmark row; the 15-case matrix is the reliability gate. Both are directory-only and remain the baseline for comparing the opt-in website phase.

## Website enrichment implementation — 2026-07-31

The next phase is implemented on branch `codex/website-enrichment` behind `enrichWebsites: true`; it is not published automatically. The pipeline caps enrichment to final deduplicated leads, groups them by canonical domain, and uses a two-worker bounded fetcher. Each domain receives one homepage request plus up to two same-domain contact/about/team candidates, a 10-second page deadline, two retries, redirect following, an HTML-only check, and a 2 MB response guard. Failed or unsupported pages leave directory fields intact.

Website parsing is explicit-only: normalized public business emails, normalized phone numbers, `mailto:` contact names, canonical social URLs, and meta/paragraph descriptions. Website page URLs are recorded as `sourceRecords` with `source: "website"`; diagnostics are sanitized and emitted per page. `OUTPUT` now includes `websiteAttempts`, `websiteSuccesses`, `websiteFailures`, `websitePagesFetched`, `websiteEmailsFound`, `websitePhonesFound`, and `websiteContactsFound`. Unit coverage includes domain deduplication, the three-page cap, transient retry, non-HTML rejection, timeout bounding, partial enrichment, disabled-path preservation, and pipeline metric wiring. No cloud website benchmark was run from this branch.

Local controlled checks on this branch: a London Xero run with `maxResults: 20` completed 5/5 profiles and 5/5 results with zero source failures; the cross-locale Xero sample (`Sydney, Australia` + `Singapore`, `maxResults: 5`) completed 8 profiles and 5 results with two known Xero profile misses. Both public directory samples exposed no normalized company website, so website attempts were correctly `0` and no website fetch was performed. The fixture suite separately verified successful extraction and bounded failures; a QuickBooks 20-lead attempt was stopped after repeated 30-second profile-render retries, before any benchmark claim.

## Next phase plan — bounded website enrichment

The global directory gate is acceptable for moving into website enrichment, with the three Xero profile misses retained as a reliability follow-up. The next release gate should:

1. Run the controlled opt-in benchmark and compare it with the directory-only baseline; keep the default false.
2. Preserve the implemented bounds: canonical public domains, 10-second page deadline, two retries, three pages per domain, low concurrency, redirect following, HTML-only parsing, and directory fallback.
3. Keep extraction explicit-only and source-traceable; never guess addresses or infer people.
4. Keep `OUTPUT` website attempts/successes/failures and contact-coverage counters stable while collecting benchmark evidence.
5. Acceptance for release is no directory regression, no unbounded work, no duplicate canonical domains, separate website/contact coverage, and unchanged behavior with `enrichWebsites: false`; decide separately whether to build or publish.

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

The prior isolated local Actor run used the earlier public sample input, which omitted both `locations` and `enrichWebsites`; the current sample explicitly demonstrates the opt-in phase. The prior runtime canonicalized the effective input to London, United Kingdom, both sources, `maxResults: 14`, directory-only mode, and contact extraction disabled. It produced one summary output with 2 search jobs, 15 directory items, 5 profiles fetched, 5 unique firms, and 5 pushed results. Xero completed with 0 failures; QuickBooks returned 10 search cards but all 10 profile-page waits timed out; website enrichment remained 0. This confirms the directory-only contract baseline and reproduces the intermittent QuickBooks profile-rendering blocker.

### Current blockers

- Xero's London page exposes five featured advisors, while its advertised full-results route currently returns 404.
- QuickBooks requires a browser and may return transient profile-rendering timeouts despite HTTP 200. Navigation and selector operations have explicit deadlines and bounded retries; the build 0.1.6 cloud matrix passed all QuickBooks search jobs, with six marked partial profiles across the matrix.
- Xero produced one profile-render miss in each of New York, Sydney, and Singapore; directory search jobs still completed and overall fully rendered profile coverage remained above the 80% gate.
- QuickBooks rendered pagination is implemented when a public next control is available and stops on exhaustion or repeated cards. Internal GraphQL cursor behavior is not used.
- Source/location jobs are interleaved before final capping, so a low `maxResults` value no longer favors the first source in processing order.
- The opt-in website phase is implemented locally on `codex/website-enrichment`; it still needs a validated build and controlled cloud benchmark before any release decision.

## Planned benchmarks

Planned benchmark inputs:

1. London, United Kingdom, both sources, 14 results, directory-only mode.
2. London, United Kingdom, Xero only, 10 results, directory-only mode.
3. London, United Kingdom, QuickBooks only, 10 results, directory-only mode.

Record runtime, compute cost, leads found, unique leads, merge count, website success rate, email rate, contact rate, and source failure rate. Validate the Actor before any benchmark. Do not publish or change pricing automatically.
