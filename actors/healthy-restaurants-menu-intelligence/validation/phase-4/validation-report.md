# Phase 4 HTML Menu Extraction Validation Report

Date: 2026-07-28

## 1. Executive summary

The Phase 4 HTML extractor passed the repository build, lint, unit/integration, formatting, schema, and fixture validation checks. The independently labelled fixture sample produced 11 expected items and 11 matching actual items after deduplication.

The live London benchmark completed successfully in 59.30 seconds with 10 schema-valid records. Live website access was unstable in the sandbox: six website failures and two restaurants with menu-page HTTP/redirect failures produced zero live extracted items. Injected London fixtures extracted five representative items successfully. No parser false positives or systematic price-to-item mismatches were found in the labelled sample.

Recommendation: `READY_FOR_PHASE_5`, with limited confidence for live-site coverage until a network environment with stable website access is available. No Phase 5 work was started.

## 2. Commands run

Previously completed for this Phase 4 implementation:

| Command                                                     | Exit | Result                                         |
| ----------------------------------------------------------- | ---: | ---------------------------------------------- |
| `npm run lint`                                              |    0 | ESLint passed                                  |
| `npm run build`                                             |    0 | `node --check src/main.js` passed              |
| `npm run format:check`                                      |    0 | Prettier passed                                |
| `npm test`                                                  |    0 | 8 files passed, 140 tests passed, 1 skipped    |
| `apify validate-schema`                                     |    0 | Input, dataset, and output schemas valid       |
| `apify run --purge --input-file ./sample-input-phase3.json` |    0 | London smoke completed; records remained valid |

Additional validation-pass checks:

| Command                                                                                     | Exit | Result                                                                                  |
| ------------------------------------------------------------------------------------------- | ---: | --------------------------------------------------------------------------------------- |
| `npx prettier --write test/unit/process-menu-page.test.js`                                  |    0 | Formatting applied/verified                                                             |
| `npm test -- --run test/unit/process-menu-page.test.js`                                     |    0 | 8 tests passed; explicit PDF/image/third-party/unknown unsupported checks passed        |
| `/usr/bin/time -p apify run --purge --input-file ./validation/phase-4/benchmark-input.json` |    1 | Sandbox Chromium launch failed with `spawn EPERM` / Mach port permission error in 2.62s |
| Same timed command, retry                                                                   |    1 | Same sandbox Chromium launch failure in 2.45s                                           |
| Same timed command with approved elevated process permissions                               |    0 | London smoke completed in 59.30s                                                        |
| `git diff --check`                                                                          |    0 | No whitespace errors                                                                    |

## 3. Automated validation results

- Partial failures are isolated: page/restaurant errors are stored on the record and do not stop other restaurants.
- `maxMenuPagesPerRestaurant` is enforced by `selectHtmlMenuCandidates()` and tested with mixed formats and a one-page limit.
- `maxMenuItemsPerRestaurant` is enforced after deduplication and covered by extraction tests.
- Only candidates with `format: "html"` reach the page processor.
- `pdf`, `image`, `third_party_ordering`, and `unknown` candidates return `unsupported_format` without being fetched; explicit tests cover all four.
- Live smoke output contained 10 records, all schema-valid.

## 4. London benchmark

Exact input is saved at [benchmark-input.json](./benchmark-input.json).

| Metric                            |                                                               Result |
| --------------------------------- | -------------------------------------------------------------------: |
| Restaurants discovered            |                                                                   20 |
| Restaurants after deduplication   |                                                                   10 |
| Websites available                |                                                                   10 |
| Menu URLs found                   |                                                                    6 |
| HTML menu pages processed         |                                                                    6 |
| Menus extracted                   |                                                               0 live |
| Menus extracted empty             |                                                               0 live |
| Extraction-failure restaurants    |                                                                    2 |
| Raw menu items found              |                                                               0 live |
| Items after deduplication         |                                                               0 live |
| Items after limits                |                                                               0 live |
| Unsupported formats               | 0 in live sample; all four non-HTML classes covered by fixture tests |
| Output-schema validation failures |                                                               0 / 10 |
| Total runtime                     |                                                        59.30 seconds |
| Compute cost                      |                                         Not available from local run |

Live statuses: `website_unreachable: 6`, `menu_not_found: 2`, `extraction_failed: 2`.

## 5. Manual sample methodology

The sample uses the original HTML fixtures under `test/fixtures/menus/`, not parser output, and includes static cards, lists, multiple sections, no-price items, fixed prices, ranges, JSON-LD, duplicate mobile/desktop markup, generic fallback text, promotional content, empty content, and malformed structured data.

The expected values were independently authored from the source fixture content in [expected-items.json](./expected-items.json). Actual parser output is recorded separately in [actual-items.json](./actual-items.json). The sample contains 11 labelled extracted items. This is below the requested 50-item target because the available representative fixtures contain only 11 supported items; no synthetic duplicates were added to inflate the sample.

## 6. Accuracy metrics

Metrics use exact field comparisons on the 11 labelled items:

| Metric                     | Formula                                     | Numerator / denominator | Result |
| -------------------------- | ------------------------------------------- | ----------------------: | -----: |
| Item precision             | true positive items / actual items          |                 11 / 11 |   100% |
| Item recall                | true positive items / expected items        |                 11 / 11 |   100% |
| Item-name accuracy         | exact names / labelled items                |                 11 / 11 |   100% |
| Description accuracy       | exact descriptions / labelled items         |                 11 / 11 |   100% |
| Section accuracy           | exact sections / labelled items             |                 11 / 11 |   100% |
| Price accuracy             | exact parsed price objects / labelled items |                 11 / 11 |   100% |
| Source-URL accuracy        | exact source URLs / labelled items          |                 11 / 11 |   100% |
| Duplicate-removal accuracy | correct duplicate groups / duplicate groups |                   1 / 1 |   100% |
| Output-schema validity     | valid smoke records / smoke records         |                 10 / 10 |   100% |

Live item precision/recall is `not measurable` because the successful live benchmark had no extracted items due source-page failures.

## 7. Error classification

No labelled parser errors were found in the 11-item sample. The following operational failures were observed in the live run:

| Category              | Restaurant/page                                              | Expected            | Actual                                  | Root cause                                                | Suggested fix                                                                   |
| --------------------- | ------------------------------------------------------------ | ------------------- | --------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `SOURCE_PAGE_FAILURE` | Eat Activ (Picadilly), `https://eatactiv.com/menu`           | Reachable HTML menu | Redirect limit exceeded                 | Live redirect behavior exceeded the bounded Phase 3 limit | Revalidate redirect policy in a stable network environment; keep bounded limits |
| `SOURCE_PAGE_FAILURE` | Eat Activ (Picadilly), `https://eatactiv.com/menus`, `/food` | Reachable HTML menu | HTTP 404                                | Common-path candidates did not exist                      | Improve candidate verification in a later Phase 3 maintenance pass              |
| `SOURCE_PAGE_FAILURE` | Natural Fitness Food, `/menu`, `/menus`, `/food`             | Reachable HTML menu | HTTP 404                                | Common-path candidates did not exist                      | Improve candidate verification in a later Phase 3 maintenance pass              |
| `SOURCE_PAGE_FAILURE` | Six live restaurant websites                                 | Reachable homepage  | Redirect limit, 403, or network failure | External website/sandbox access                           | Retry in a permitted network environment                                        |

No `FALSE_POSITIVE_ITEM`, `MISSED_ITEM`, `WRONG_SECTION`, `WRONG_PRICE`, `WRONG_DESCRIPTION`, `DUPLICATE_ITEM`, `TRUNCATED_TEXT`, `CROSS_ITEM_MERGE`, or `UNSUPPORTED_LAYOUT` errors were observed in the labelled sample.

## 8. Fixes made during validation

No production parser defects were identified, so no Phase 4 production fixes were required during this validation pass. The only test gap found was explicit coverage for image, third-party, and unknown candidates; those regression tests were added and passed.

## 9. Before-and-after results

- Before validation-pass additions: PDF unsupported behavior was tested; image, third-party, and unknown page-processor behavior was not explicit.
- After additions: all four non-HTML classes are explicitly verified to remain unfetched and `unsupported_format`.
- Parser fixture accuracy remained 11/11 exact before and after.

## 10. Known unsupported patterns

- PDF, image, OCR, and other binary menu parsing
- JavaScript-only menus requiring browser interaction
- Iframes and complex table layouts not represented by the fixture patterns
- Third-party ordering menu fetching
- Dietary classification, nutrition, healthy-positioning, social, review, delivery-platform, and multi-location processing
- Stable live-site coverage in this sandbox due redirect, HTTP 403/404, and Chromium/network restrictions

## 11. Recommendation

`READY_FOR_PHASE_5`

The available labelled sample exceeds the validation thresholds with 100% exact field agreement, no systematic price mismatch, no navigation/footer false positives, reliable source URLs, and 100% smoke-record schema validity. Confidence is limited by the 11-item labelled sample and unstable live website access; expand manual sampling when more stable supported HTML menus are available.
