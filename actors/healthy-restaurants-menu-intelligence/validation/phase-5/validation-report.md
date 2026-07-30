# Phase 5 Validation and Quality Review Report

Date: 2026-07-28

## 1. Executive summary

Phase 5 was reviewed across dietary taxonomy and legends, item-level extraction, restaurant aggregation, published nutrition parsing, healthy-positioning scoring, validators, schemas, fixtures, tests, safety wording, and the latest London output.

The review found and fixed six clear Phase 5 defects:

- confidence could exceed `1.0` when signal weights summed above 100;
- conflicting legend definitions used the last definition;
- nested JSON-LD menu-item text could become a restaurant-level dietary claim;
- repeated item names could borrow evidence from the first matching page block;
- implausibly large nutrition values were accepted;
- equal-strength dietary evidence could duplicate one restaurant-level option.

The final validation suite passes, the Actor smoke run exits successfully, all ten London records remain schema-valid, and no prohibited medical or allergen-safety claims are emitted.

## 2. Validation conclusion

The live benchmark produced zero extracted menu items because of external redirect, 403, 404, and network failures. Dietary and nutrition accuracy therefore relies on the independent saved-fixture sample described below; the sample is smaller than the requested targets because the available live and Phase 4 corpus does not contain enough supported Phase 5 examples. The single final recommendation appears in section 20.

## 3. Scope reviewed

Reviewed:

- supported dietary IDs, original labels, source types, URLs, confidence, and legend resolution;
- item-level tags, section evidence, page claims, metadata, JSON-LD boundaries, aggregation, and deduplication;
- calories, protein, carbohydrates, fat, sodium, serving size, units, combined text, tables, malformed values, and provenance;
- official-positioning, menu-section, nutrition-publication, dietary-density, meal-prep, fitness, and weak-keyword signals;
- output validators, actor input/output/dataset schemas, README, sample input, benchmark notes, fixtures, tests, and local dataset output;
- reuse of existing normalization, Phase 4 extraction, website crawling, error isolation, and validation modules;
- repository safety wording and out-of-scope feature boundaries.

No Phase 6 feature, PDF/OCR parser, nutrition estimator, medical recommendation, allergen guarantee, review/social scraper, delivery integration, multi-location mode, price monitor, or auto-publish/pricing behavior was added.

## 4. Commands run

| Exact command                                                                               | Exit | Result                                                         |
| ------------------------------------------------------------------------------------------- | ---: | -------------------------------------------------------------- |
| `npm run build`                                                                             |    0 | `node --check src/main.js` passed.                             |
| `npm run lint`                                                                              |    0 | ESLint passed across source, tests, and validation artifacts.  |
| `npm test`                                                                                  |    0 | 158 tests passed; 1 gated live test skipped by default.        |
| `npm run format:check`                                                                      |    0 | Prettier passed.                                               |
| `npm test -- --run test/integration`                                                        |    0 | 2 fixture integration files passed; 1 live-gated file skipped. |
| `RUN_LONDON_INTEGRATION=1 npm test -- --run test/integration/london-discovery.test.js`      |    0 | Live London discovery integration passed: 1 test.              |
| `apify --help`                                                                              |    0 | Apify CLI `1.7.1` available.                                   |
| `apify validate-schema`                                                                     |    0 | Input, dataset, and output schemas valid.                      |
| `/usr/bin/time -p apify run --purge --input-file ./validation/phase-5/benchmark-input.json` |    0 | Final elevated London Actor smoke completed in 72.28 seconds.  |
| `git diff --check`                                                                          |    0 | No whitespace errors.                                          |

No type-checking command is configured: the package has no `typecheck` script, `tsconfig.json`, or TypeScript compiler dependency. The configured `build` script is syntax validation only.

One earlier benchmark attempt exited `1` because `APIFY_LOCAL_STORAGE_DIR` separated the CLI-written input from the Actor-read storage. The same saved input was rerun with default Apify local storage and exited `0`; this was a validation harness issue, not an Actor failure.

## 5. Automated test results

- All supported IDs are checked against the 15-value taxonomy in validators and tests.
- Dietary confidence is bounded to `[0, 1]`; final live output had maximum healthy-positioning confidence `0.69`.
- Explicit tags carry source type, source URL, original label, and confidence when emitted.
- `V`, `VE`, and `VG` remain unresolved without a page legend; conflicting mappings remain unresolved.
- Nutrition objects are emitted only when at least one supported field is present, use `restaurant_published`, and carry an official source URL.
- Missing, malformed, unrelated, and implausible nutrition remains `null`.
- Positive classification fixtures have official/menu/nutrition evidence; discovery keywords alone remain weak.
- One salad, vegan item, or gluten-free item does not classify a restaurant as healthy-focused.
- Page and menu failures are isolated into warnings/errors; partial records are still validated before `Actor.pushData()`.
- No-dietary, no-nutrition, ambiguous-label, insufficient-evidence, malformed-nutrition, unsupported-format, and page-failure paths remain schema-valid.

## 6. London benchmark

Exact input: [benchmark-input.json](./benchmark-input.json).

| Metric                               |                                    Final result |
| ------------------------------------ | ----------------------------------------------: |
| Restaurants discovered               |                   30 cards across 3 search jobs |
| Restaurants after deduplication      |                                              10 |
| Websites available                   |                                              10 |
| HTML menu pages attempted            |                                               6 |
| Menus with extracted items           |                                               0 |
| Total menu items                     |                                               0 |
| Items with dietary tags              |                                               0 |
| Restaurants with dietary options     |                                               2 |
| Restaurants with published nutrition |                                               0 |
| Items with published nutrition       |                                               0 |
| Nutrition parse failures             | 0 observed; no item reached parser successfully |
| Healthy-focused restaurants          |                                               0 |
| Uncertain/mixed classifications      |                                              10 |
| Not healthy-focused classifications  |                                               0 |
| Classification failures              |                                               0 |
| Schema validation failures           |                                          0 / 10 |
| Output size                          |                  22,197 bytes across 10 records |
| Runtime                              |                                   72.28 seconds |
| Compute cost                         |                    Not available from local run |

Menu statuses were `website_unreachable: 6`, `menu_not_found: 2`, and `extraction_failed: 2`. The two dietary-option records came from official homepage claims; no item-level result was available for live precision/recall.

Phase 4 runtime was 59.30 seconds for the comparable 10-restaurant smoke, so Phase 5 was 12.98 seconds slower, a 21.85% increase. The increase is consistent with additional bounded homepage/menu analysis, but live network variance is a confounder. Phase 4 output byte size was not recorded, so output-size change is `not measurable`.

## 7. Ground-truth methodology

Expected values were authored independently from saved raw evidence and fixture text before comparing actual function output. Actor output was not used as ground truth. Evidence and expected/actual records are stored in:

- [sampled-restaurants.json](./sampled-restaurants.json)
- [expected-dietary.json](./expected-dietary.json) and [actual-dietary.json](./actual-dietary.json)
- [expected-nutrition.json](./expected-nutrition.json) and [actual-nutrition.json](./actual-nutrition.json)
- [expected-classifications.json](./expected-classifications.json) and [actual-classifications.json](./actual-classifications.json)

The available sample contains 11 positive dietary-tag decisions plus 4 negative/ambiguous boundary decisions, 16 populated nutrition-field decisions plus 2 false-number/implausible negatives, and 10 restaurant classification decisions. It does not reach 50 dietary items or 30 nutrition fields because the live benchmark returned zero supported menu items and the Phase 4 fixture corpus contained no labelled Phase 5 nutrition/dietary set. No synthetic duplicate rows were added to inflate denominators.

## 8. Dietary accuracy metrics

Metrics use normalized tag sets and exact provenance fields on the independent saved sample.

| Metric                            | Numerator / denominator |         Result | Sample/method                                                                                                                                    |
| --------------------------------- | ----------------------: | -------------: | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Explicit dietary-tag precision    |                 11 / 11 |           100% | 11 expected positive tag decisions; exact normalized ID and provenance comparison                                                                |
| Explicit dietary-tag recall       |                 11 / 11 |           100% | Same labelled positive set                                                                                                                       |
| Normalized-ID accuracy            |                 11 / 11 |           100% | Exact supported ID comparison                                                                                                                    |
| Legend-resolution accuracy        |                   5 / 5 |           100% | `V`/`VG` with legend, without legend, and conflicting legend                                                                                     |
| Item-association accuracy         |                   2 / 2 |           100% | Repeated same-name item blocks with distinct labels/sections                                                                                     |
| Restaurant-level option precision |          not measurable | not measurable | No independently labelled live restaurant-option sample; unit coverage confirms isolated-item suppression and strongest-provenance deduplication |

The sample confirms `V` is not assumed vegan, `VG` is not normalized without evidence, conflicting definitions are unresolved, inferred options are not marked explicit, duplicate same-ID restaurant evidence is reduced to the strongest provenance, and no allergen-safety field is emitted.

## 9. Nutrition accuracy metrics

| Metric                          | Numerator / denominator | Result | Sample/method                                                                         |
| ------------------------------- | ----------------------: | -----: | ------------------------------------------------------------------------------------- |
| Nutrition-field precision       |                 16 / 16 |   100% | Combined, reverse-label, table, and serving-size fields                               |
| Nutrition-field recall          |                 16 / 16 |   100% | Same labelled fields                                                                  |
| Calories accuracy               |                   3 / 3 |   100% | Combined, reverse-label, and table cases                                              |
| Protein accuracy                |                   3 / 3 |   100% | Combined, reverse-label, and table cases                                              |
| Carbohydrate accuracy           |                   3 / 3 |   100% | Combined, reverse-label, and table cases                                              |
| Fat accuracy                    |                   3 / 3 |   100% | Combined, reverse-label, and table cases                                              |
| Sodium accuracy                 |                   2 / 2 |   100% | Combined and reverse-label cases; table correctly has no sodium field                 |
| Serving-size accuracy           |                   1 / 1 |   100% | Explicit serving-size case                                                            |
| Provenance accuracy             |                 16 / 16 |   100% | Every populated field object uses `restaurant_published` and the fixture URL          |
| False nutrition inference count |                       0 |      0 | Price, ounce, percentage, item-count, and implausible-magnitude cases returned `null` |

No values came from AI estimation, ingredient assumptions, external databases, reviews, or similar dishes.

## 10. Healthy-classification metrics

| Metric                         | Numerator / denominator | Result | Sample/method                                                                  |
| ------------------------------ | ----------------------: | -----: | ------------------------------------------------------------------------------ |
| Healthy-focused precision      |                   3 / 3 |   100% | Strong official, macro-program, and meal-prep fixtures                         |
| Healthy-focused recall         |                   3 / 3 |   100% | Same three positive fixtures                                                   |
| False-positive rate            |                   0 / 7 |     0% | Mixed, keyword-only, one-salad, one-vegan, one-GF, fresh/natural, insufficient |
| False-negative rate            |                   0 / 3 |     0% | Positive fixture set                                                           |
| Positive evidence completeness |                   3 / 3 |   100% | Every positive has supporting signals                                          |

Confidence calibration is directionally correct in this small sample: all positive cases are in `0.70–1.00`, while uncertain/insufficient cases are `0.40–0.69`. No sampled case fell in `0.00–0.39`. The cap at `1.00` was added after the review found raw weights could sum to `1.25`.

Keyword-only, single-salad, single-vegan, and single-gluten-free cases produced no strong positive classification. Generic `fresh`/`natural` wording produced no signal.

## 11. Safety and claims review

Repository and output searches found no emitted fields or claims named `safeForDiabetes`, `recommendedForWeightLoss`, `allergenSafe`, `safeForCeliac`, `safeForNutAllergy`, or `medicallyApproved`.

The README explicitly states that restaurant labels are not safety guarantees, cross-contamination is not inferred, and the Actor does not provide medical, dietary, or allergen-safety advice. Gluten-free, dairy-free, and nut-free labels remain provenance-bearing restaurant/menu claims rather than independent verification.

The only medical/allergen wording found is limitation language in documentation/comments and existing menu-discovery candidate vocabulary; it is not emitted as advice or a guarantee.

## 12. Error table

All clear Phase 5 defects were fixed and have regression coverage. Full details are in [error-cases.json](./error-cases.json).

| Category                                  | Severity        | Status                                                                                               |
| ----------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| `HEALTHY_CONFIDENCE_MISLEADING`           | critical        | Fixed; confidence is capped at `1.0`.                                                                |
| `DIETARY_LEGEND_RESOLUTION_ERROR`         | high            | Fixed; conflicting mappings remain unresolved.                                                       |
| `DIETARY_OVERGENERALIZED_TO_RESTAURANT`   | high            | Fixed for nested JSON-LD and isolated menu-item blocks.                                              |
| `DIETARY_WRONG_ITEM_ASSOCIATION`          | high            | Fixed; evidence is captured from each extracted item block.                                          |
| `NUTRITION_FALSE_POSITIVE`                | high            | Fixed; implausible magnitudes return `null`.                                                         |
| Duplicate restaurant-level dietary option | medium          | Fixed; strongest provenance is retained once per normalized ID.                                      |
| `SOURCE_PAGE_FAILURE`                     | low operational | Remains external/live-site coverage limitation: redirect limits, HTTP 403/404, and network failures. |

## 13. Root-cause summary

The fixed defects came from boundary handling rather than site-specific rules: score normalization, conflict state, page-vs-item evidence scope, first-match HTML association, and value plausibility. The fixes are reusable and contain no restaurant names, domains, URLs, or menu-item selectors beyond generic menu-item patterns.

## 14. Fixes made

- Cap healthy-positioning confidence after scoring.
- Omit conflicting shorthand legend mappings.
- Restrict JSON-LD restaurant metadata extraction to top-level description/slogan/keywords/about fields.
- Remove generic menu-item blocks before page-level restaurant claim extraction.
- Preserve block-local evidence through Phase 4 extraction and strip it before public output.
- Reject nutrition values above conservative per-item bounds.
- Keep strongest restaurant-level dietary provenance once per normalized ID.
- Add regression tests for every fix.

Before/after values are recorded in [before-after-metrics.json](./before-after-metrics.json).

## 15. Known unsupported patterns

- Live HTML pages that redirect beyond the bounded redirect limit, return 403/404, or require unavailable network access;
- JavaScript-only menus not represented by the current HTTP HTML fixtures;
- complex nested/table layouts outside the supported deterministic table format;
- PDF/image/OCR menus;
- third-party ordering contents;
- nutrition or dietary claims hidden behind interaction not available to the current fetch path;
- multilingual normalization beyond the English output contract.

## 16. Remaining risks

- Live item-level dietary/nutrition precision and recall remain `not measurable` in this London run because zero menu items were extracted.
- Manual denominators are below the requested 50 dietary and 30 nutrition targets; this is documented and not inflated.
- Conservative magnitude bounds may reject legitimate unusually large shared/party portions; the current contract is item-oriented.
- Restaurant-level claim precision needs a larger independently labelled live sample once stable supported HTML pages are available.

## 17. Output-contract review

Final London output contained 10 records, all passing `isRestaurantOutput`, with valid dietary IDs/confidence contracts and valid null-or-provenanced nutrition contracts. No item-level tags or nutrition were emitted from failed pages. Two homepage dietary-option records retained official source URLs and high confidence; they were not counted as item-level accuracy evidence.

## 18. Runtime and reuse review

No dependency was added. Phase 5 reuses existing normalization, HTML menu extraction, menu-page processing, website crawling, concurrency, restaurant deduplication, schema validation, and Apify dataset output. The only new modules are focused dietary, nutrition, classification, and validation-artifact modules.

## 19. Before-and-after summary

Before review, the independent matrix exposed five logic defects plus one duplicate-output issue. After fixes, the matrix is 11/11 dietary positive decisions, 16/16 nutrition fields, 0 false nutrition in negative cases, 3/3 positive classification decisions, 0/7 classification false positives, and 10/10 schema-valid live records. The fresh London run remains source-page limited rather than parser-positive.

## 20. Recommendation for Phase 6

`READY_FOR_PHASE_6`

Phase 5 meets the internal fixture thresholds, has 100% nutrition provenance accuracy, emits no estimated nutrition or unsafe medical/allergen claims, and preserves valid partial records. Expand the labelled sample during Phase 6 planning when stable official HTML menu sources become available; do not treat the live London zero-item result as evidence of parser recall.
