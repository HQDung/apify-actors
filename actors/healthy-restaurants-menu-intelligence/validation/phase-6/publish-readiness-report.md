# Phase 6 Publish-Readiness Report

Date: 2026-07-30

## Executive summary

Phase 6 hardened the Healthy Restaurants & Menu Intelligence Actor without adding product features. The runtime now uses bounded internal concurrency and network limits, retries only transient failures, rejects oversized response bodies, standardizes operational error categories, preserves sibling work after failures, validates every record before pushing it, and logs a concise aggregate run summary.

The final local benchmarks completed successfully. The small run pushed 10 of 10 schema-valid records. The standard run pushed 30 of 30 schema-valid records and retained 117 deduplicated menu items across three extracted menus. A regression found during the standard run—an undefined internal `sourceEvidenceText` field reintroduced by duplicate menu-item merging—was fixed with a regression test and confirmed by the post-fix rerun.

The authenticated Apify account is valid and contains the pushed private Actor `ItLJs9pHV9h1Ysiyt` at build `0.1.1` (`Kw1f0vkx6MCFxiQhg`). Three authorized cloud smoke runs completed successfully without publishing or pricing changes. They produced 40 schema-valid records, zero duplicate restaurant IDs, 326.034 seconds of runtime, 0.362260 compute units, and $0.074536 total reported usage.

## Phase 5 prerequisite

`validation/phase-5/validation-report.md` contains `READY_FOR_PHASE_6`. Phase 5 tests and fixtures remain part of the final verification suite.

## Reliability changes

- Added transient-only retry handling for `408`, `425`, `429`, `5xx`, network reset/refusal/DNS retry errors, aborts, and timeouts; deterministic failures are not retried.
- Kept redirects manual and bounded to three hops.
- Applied 30-second website/menu request and body-processing timeouts.
- Rejected response bodies over 2,000,000 characters.
- Kept Playwright discovery/detail concurrency at four and website enrichment concurrency at three.
- Preserved existing per-job, per-restaurant, and per-menu-page failure isolation.
- Standardized blocked, unreachable, not-found, extraction, and discovery error codes.
- Closed Playwright contexts in `finally` blocks and closed the browser in Actor shutdown.
- Skipped malformed records rather than pushing them; the validator now reports contract paths for diagnosis.
- Fixed duplicate menu-item merging so internal evidence fields are never exposed as `undefined` output properties.
- Added aggregate `Run summary` metrics for discovery, websites, menus, items, classifications, messages, pushed results, and runtime.

## Runtime settings

| Setting                                 |                                   Value |
| --------------------------------------- | --------------------------------------: |
| Playwright discovery/detail concurrency |                                       4 |
| Website enrichment concurrency          |                                       3 |
| Google Maps navigation timeout          |                              60 seconds |
| Website/menu timeout                    |                              30 seconds |
| Maximum redirects                       |                                       3 |
| Total attempts for transient requests   |                                       2 |
| Retry delay                             | 250 ms, exponential, capped at 1 second |
| Maximum response body                   |                    2,000,000 characters |
| Default menu pages per restaurant       |                                       3 |
| Default menu items per restaurant       |                                     200 |
| Default restaurants per run             |                                      30 |

## Commands and results

| Command                                                             | Exit | Result                                                         |
| ------------------------------------------------------------------- | ---: | -------------------------------------------------------------- |
| `rg -n "READY_FOR_PHASE_6" validation/phase-5/validation-report.md` |    0 | Phase 5 gate confirmed.                                        |
| `apify --help`                                                      |    0 | Apify CLI available.                                           |
| `npm run build`                                                     |    0 | JavaScript syntax check passed.                                |
| `npm run lint`                                                      |    0 | ESLint passed.                                                 |
| `npm test`                                                          |    0 | 168 tests passed; 1 gated live test skipped.                   |
| `npm run format:check`                                              |    0 | Prettier passed.                                               |
| `npm test -- --run test/integration`                                |    0 | Fixture integrations passed; live-gated test remained skipped. |
| `npx apify validate-schema`                                         |    0 | Input, dataset, and output schemas valid.                      |
| `git diff --check`                                                  |    0 | No whitespace errors.                                          |
| `apify actors start ...` + `apify runs wait ...` (3 cloud inputs)   |    0 | Three cloud runs succeeded on build `0.1.1`.                   |
| Cloud dataset validator (3 datasets)                                |    0 | 40/40 records passed `isRestaurantOutput`; 0 duplicate IDs.    |

No type-check command is configured in `package.json`; no unconfigured type-check command was invented.

## Local benchmarks

Full measured data is in [local-benchmark-results.json](./local-benchmark-results.json).

| Metric                                 |       Small |    Standard |
| -------------------------------------- | ----------: | ----------: |
| Search jobs                            |           1 |           4 |
| Raw places                             |          10 |         120 |
| Restaurants after deduplication        |          10 |          30 |
| Websites available / reachable         |      10 / 4 |     30 / 13 |
| HTML menus processed                   |           9 |          31 |
| Extracted menu pages                   |           0 |           6 |
| Restaurants with extracted menu status |           0 |           3 |
| Raw / deduplicated menu items          |       0 / 0 |   234 / 117 |
| Items with dietary tags                |           0 |          90 |
| Items with published nutrition         |           0 |           0 |
| Healthy / uncertain / not healthy      |  0 / 10 / 0 |  0 / 30 / 0 |
| Records pushed                         |          10 |          30 |
| Schema validity                        |        100% |        100% |
| Wall-clock runtime                     |      54.46s |     255.19s |
| Local compute cost                     | unavailable | unavailable |

The live menu coverage is limited by redirects, blocked pages, missing menus, and extraction failures. Phase 5 deterministic fixtures remain the evidence source for item-level dietary and published-nutrition behavior; the live runs produced no published nutrition values and must not be read as parser-recall measurements.

## Cloud benchmark

Full measured data is in [cloud-benchmark-results.json](./cloud-benchmark-results.json). The private Actor `ItLJs9pHV9h1Ysiyt` ran build `0.1.1` successfully for all three inputs.

| Input                          | Records | Schema-valid | Duplicate IDs | Menu statuses                                   |      Runtime | Compute units |         Usage |
| ------------------------------ | ------: | -----------: | ------------: | ----------------------------------------------- | -----------: | ------------: | ------------: |
| Menu enabled, 10 restaurants   |      10 |         100% |             0 | 4 unreachable, 2 not found, 1 missing, 3 failed |      70.259s |      0.078066 |     $0.016020 |
| Menu disabled, 10 restaurants  |      10 |         100% |             0 | 10 not requested                                |      49.688s |      0.055209 |     $0.011354 |
| Three keywords, 20 restaurants |      20 |         100% |             0 | 9 unreachable, 3 not found, 1 missing, 7 failed |     206.087s |      0.228986 |     $0.047162 |
| **Total**                      |  **40** |     **100%** |         **0** | **40 successful records; 0 menu items**         | **326.034s** |  **0.362260** | **$0.074536** |

The menu-disabled run confirmed that `includeMenu: false` emits `not_requested` for all records. The menu-enabled samples produced four restaurant-level dietary-option records but no menu items or published nutrition values; the live results remain source-page limited and are not parser-recall measurements.

## Output-quality review

[sample-output.json](../../sample-output.json) contains two final local Actor records, both validated by `isRestaurantOutput`:

- `Mallow Borough Market`: valid partial record with `website_unreachable` and a bounded redirect error;
- `KIN Cafe`: valid `menu_not_found` record with an official `plant_based` restaurant claim and source URL.

The final standard run also manually confirmed three extracted-menu records with prices and 117 retained items. Published nutrition was absent from the live sample; published-nutrition examples remain in the independent Phase 5 validation fixtures. No estimated nutrition, medical claims, allergen guarantees, or unproven safety statements were emitted.

## Schema, README, and Store review

- Actor input, output, and dataset schemas validate.
- Public inputs remain simple and bounded; timeout, retry, selector, and parser internals are not exposed.
- `includeMenu: false` remains supported and skips website crawling.
- README now covers Version 1 scope, London-tested/global-first positioning, supported and unsupported formats, inputs, outputs, provenance, published-nutrition-only behavior, classification, limitations, benchmarks, responsible use, and roadmap.
- Store title is `Healthy Restaurants & Menu Intelligence`.
- Store description emphasizes structured restaurant/menu intelligence, dietary provenance, published nutrition, and explainable positioning rather than generic Maps scraping.
- No automatic publishing or pricing changes occurred.

## Known limitations and remaining risks

- Google Maps and restaurant websites can redirect, block, rate-limit, or omit usable menu links; valid partial records are preserved, but live item coverage remains source-dependent.
- Cloud coverage is limited to the three London smoke inputs and the private Actor build tested here; it is not a production-scale accuracy study.
- Local runs do not expose Apify compute cost, while the cloud runs reported $0.074536 total usage across three inputs.
- PDF/image/OCR, third-party ordering pages, nutrition estimation, allergen-safety guarantees, reviews/social, delivery platforms, multi-location support, monitoring, alerts, and new discovery sources remain out of scope.
- The labelled Phase 5 fixture sample is smaller than production-scale accuracy targets; it must not be generalized beyond supported deterministic patterns.

## Final recommendation

`READY_TO_PUBLISH`

The local and cloud verification criteria pass: all three cloud runs succeeded on the pushed build, all 40 cloud records passed the output validator, duplicate IDs were zero, menu-disabled behavior was confirmed, and runtime/cost fields were captured. The live samples remain source-dependent and contain no extracted menu items, so Phase 5 deterministic fixtures remain the evidence for positive item-level dietary and nutrition extraction. No publishing or pricing change was performed by this validation pass.
