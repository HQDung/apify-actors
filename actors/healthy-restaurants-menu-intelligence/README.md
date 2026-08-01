# Healthy Restaurants & Menu Intelligence

This Apify Actor is intended to discover healthy-focused restaurants in one location and turn public, official restaurant website menus into structured, dietary-aware data. The design is global-first: London, United Kingdom (English sources and GBP) is the initial test market, while the contracts remain usable for future countries, languages, and currencies.

## Version 1 scope and status

Version 1 discovers public restaurant listings in one requested location, then optionally crawls bounded official websites and supported HTML menu pages. It extracts deterministic menu sections, items, descriptions, prices, explicit dietary labels, and restaurant-published nutrition. It also emits explainable healthy-positioning signals with bounded confidence. London is the tested initial market; the contracts are global-first for future countries, languages, and currencies.

Phase 6 hardens retries, timeouts, redirects, concurrency, resource cleanup, error isolation, bounded discovery detail work, and aggregate run statistics. The Actor preserves valid partial records when websites or menu pages fail. Current measured benchmark results are recorded in [BENCHMARK_LONDON.md](./BENCHMARK_LONDON.md) and [validation/phase-6/](./validation/phase-6/).

## Supported and unsupported menu formats

Supported: public HTML menu pages containing JSON-LD, embedded structured data, repeated DOM menu cards, or deterministic text patterns. Unsupported formats become valid records with an explicit status: PDF menus, image menus, OCR, third-party ordering platforms, and formats that cannot be classified safely. Nutrition is never inferred when a page does not publish it.

## Input

The public input has exactly eight fields:

- `location` (required string): one city, region, or country. Example: `London, United Kingdom`.
- `keywords` (optional string array): healthy-restaurant search phrases. Defaults to `healthy restaurant`, `high protein restaurant`, `healthy meal prep`, `salad bar`, and `clean eating restaurant`.
- `maxRestaurants` (optional integer, 1–100, default `30`): maximum unique restaurants after discovery deduplication. Lightweight Google Maps place cards are deduplicated and detail extraction is bounded to this cap before website enrichment.
- `includeMenu` (optional boolean, default `true`): whether later phases should crawl official menu pages.
- `normalizedOutputLanguage` (optional string, currently only `en`, default `en`): language for normalized output.
- `preserveOriginalText` (optional boolean, default `true`): retain source-language names and descriptions beside normalized values.
- `maxMenuPagesPerRestaurant` (optional integer, 1–10, default `3`): cap on official pages considered per restaurant.
- `maxMenuItemsPerRestaurant` (optional integer, 1–1000, default `200`): cap on nested items stored for each restaurant.

The Actor applies conservative internal runtime limits: four Playwright discovery/detail workers, three website workers, lightweight place-card deduplication before detail extraction, a detail-candidate cap equal to `maxRestaurants`, a 60-second Google Maps navigation timeout, 30-second website/menu request and body-processing timeout, three redirects, two total attempts for transient network responses, and a 2,000,000-character response-body limit. These settings are intentionally not exposed as advanced public controls.

Examples: [sample-input.json](./sample-input.json) and [sample-input-phase5.json](./sample-input-phase5.json).

The validated representative output is available in [sample-output.json](./sample-output.json). It includes a valid website-failure record and a valid official dietary-claim record. Live London pages may not provide a stable menu or nutrition result on every run; deterministic menu, price, dietary-label, and published-nutrition examples are covered by the validation fixtures.

## Planned output

The Actor writes one dataset record per restaurant, with extracted menu items nested under `menu.items` rather than one dataset row per item. Phase 5 adds dietary, nutrition, and healthy-positioning evidence to the Phase 4 shape:

```json
{
  "actorOutputSchemaVersion": 1,
  "restaurantId": "place-identity-hash",
  "restaurantName": "Example Kitchen",
  "restaurantNameNormalized": "example kitchen",
  "matchedKeywords": ["healthy restaurant", "salad bar"],
  "location": {
    "address": null,
    "city": "London",
    "region": "England",
    "country": "United Kingdom",
    "countryCode": "GB",
    "postalCode": null,
    "latitude": null,
    "longitude": null
  },
  "contact": { "website": "https://example.com", "phone": null },
  "sourceBusiness": {
    "platform": "google_maps",
    "sourceUrl": "https://www.google.com/maps/...",
    "scrapedAt": "2026-07-26T10:00:00.000Z"
  },
  "rating": null,
  "reviewCount": null,
  "priceLevel": null,
  "healthyPositioning": {
    "isHealthyFocused": false,
    "confidence": 0,
    "signals": []
  },
  "dietaryOptions": [],
  "menu": {
    "status": "not_requested",
    "sourceUrl": null,
    "menuUrls": [],
    "menuCandidates": [],
    "extractionMethods": [],
    "itemsFound": 0,
    "items": []
  },
  "language": { "detected": "en", "normalizedOutput": "en" },
  "warnings": [],
  "errors": [],
  "scrapedAt": "2026-07-26T10:00:30.000Z"
}
```

Menu status values explicitly describe enrichment progress (`not_requested`, `website_missing`, `website_unreachable`, `menu_not_found`, `menu_found`, `unsupported_format`, `extraction_failed`, `extracted`, and `extracted_empty`). `menu_found` means a candidate URL was discovered but its contents have not been parsed. Extracted items preserve source text, normalized text, price formatting, source URLs, extraction methods (`json_ld`, `embedded_json`, `dom_repeated_structure`, or `generic_text_parser`), dietary tags, and `publishedNutrition` only when official nutrition text is present. Dietary tags include `sourceType`, `sourceUrl`, original labels, and confidence; ambiguous shorthand such as `V` is not normalized without a legend. Nutrition includes `sourceType: "restaurant_published"` and `sourceUrl`; values are never estimated.

## Dietary and nutrition provenance

Dietary values use language-independent IDs: `vegan`, `vegetarian`, `gluten_free`, `dairy_free`, `nut_free`, `halal`, `kosher`, `organic`, `high_protein`, `low_carb`, `keto`, `low_calorie`, `plant_based`, `sugar_free`, and `no_added_sugar`. Each tag retains the restaurant's original label where available, a source type (`restaurant_claim`, `menu_label`, `menu_section`, `menu_description`, `website_metadata`, or `inferred`), source URL, and confidence. Explicit restaurant claims are preferred; labels are not safety guarantees.

Nutrition is included only when the restaurant explicitly publishes it. Every nutrition object uses `sourceType: "restaurant_published"` and may contain calories, protein, carbohydrate, fat, sodium, and serving-size text. Values are never estimated from ingredients, photos, similar meals, AI assumptions, or external nutrition databases.

## Responsible use and boundaries

The Actor extracts publicly available restaurant and menu information with source provenance. It does not provide medical, dietary, or allergen-safety advice. In particular, it does not guarantee allergen absence, cross-contamination safety, or suitability for a medical condition; users must verify claims with the restaurant.

Version 1 excludes OCR, PDF menu parsing, social scraping (including Instagram, Threads, and reviews), multi-location or multi-country runs, delivery-platform integrations, nutrition estimation, calorie estimation, price-change monitoring, scheduled monitoring, personal contact extraction, outreach generation, advanced lead scoring, and automatic publishing or pricing changes. Unsupported menu formats should become valid records with an explicit status in later phases rather than fail the run.

## Benchmark and publish preparation

The London benchmark measures discovery, website availability/reachability, menu-page outcomes, item coverage, dietary/nutrition coverage, classification distribution, duplicate rate, schema validity, runtime, and any Apify-reported cost. Local and cloud values are kept separate; unavailable cost or cloud values are reported as unavailable rather than estimated. See [BENCHMARK_LONDON.md](./BENCHMARK_LONDON.md) for the current measured comparison.

The final 2026-07-29 local measurements were:

| Input                    | Restaurants | Websites reachable | HTML menus | Menu items | Schema-valid | Runtime |
| ------------------------ | ----------: | -----------------: | ---------: | ---------: | -----------: | ------: |
| Small, 10 restaurants    |          10 |                  4 |          9 |          0 |         100% |  54.46s |
| Standard, 30 restaurants |          30 |                 13 |         31 |        117 |         100% | 255.19s |

These values are source-dependent observations, not completeness guarantees. The updated public cloud build `0.1.2` passed the exact default five-keyword Store test: 30/30 records were schema-valid with 0 duplicate IDs in 202.394 seconds, using 0.224882 compute units and $0.046289 reported usage. It discovered 150 raw cards, bounded detail extraction to 30 candidates, and returned 78 menu items. See [validation/phase-6/cloud-benchmark-results.json](./validation/phase-6/cloud-benchmark-results.json) for all run IDs and measurements.

## Roadmap

Phase 5 added deterministic dietary extraction, published nutrition parsing, evidence-based healthy classification, and regression coverage. Phase 6 prepares Version 1 for publication through reliability review, measured benchmarks, documentation, and Store metadata. Later versions may add broader coverage without changing the no-estimation and no-auto-publish boundaries.
