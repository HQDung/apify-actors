# Healthy Restaurants & Menu Intelligence

This Apify Actor is intended to discover healthy-focused restaurants in one location and turn public, official restaurant website menus into structured, dietary-aware data. The design is global-first: London, United Kingdom (English sources and GBP) is the initial test market, while the contracts remain usable for future countries, languages, and currencies.

## Phase 3 status

Phase 3 adds bounded official-homepage crawling, safe redirect handling, menu-link discovery, format classification, scoring, and provenance. It does not fetch or parse menu contents. Phase 2 restaurant discovery and branch-safe deduplication remain unchanged.

## Input

The public input has exactly eight fields:

- `location` (required string): one city, region, or country. Example: `London, United Kingdom`.
- `keywords` (optional string array): healthy-restaurant search phrases. Defaults to `healthy restaurant`, `high protein restaurant`, `healthy meal prep`, `salad bar`, and `clean eating restaurant`.
- `maxRestaurants` (optional integer, 1–100, default `30`): maximum unique restaurants after discovery deduplication.
- `includeMenu` (optional boolean, default `true`): whether later phases should crawl official menu pages.
- `normalizedOutputLanguage` (optional string, currently only `en`, default `en`): language for normalized output.
- `preserveOriginalText` (optional boolean, default `true`): retain source-language names and descriptions beside normalized values.
- `maxMenuPagesPerRestaurant` (optional integer, 1–10, default `3`): cap on official pages considered per restaurant.
- `maxMenuItemsPerRestaurant` (optional integer, 1–1000, default `200`): cap on nested items stored for each restaurant.

Example: [sample-input.json](./sample-input.json).

## Planned output

The Actor writes one dataset record per restaurant, with menu items reserved for later phases under `menu.items` rather than one dataset row per item. The current Phase 3 shape includes:

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
    "itemsFound": 0,
    "items": []
  },
  "language": { "detected": "en", "normalizedOutput": "en" },
  "warnings": [],
  "errors": [],
  "scrapedAt": "2026-07-26T10:00:30.000Z"
}
```

Menu status values explicitly describe enrichment progress (`not_requested`, `website_missing`, `website_unreachable`, `menu_not_found`, `menu_found`, `unsupported_format`, `extraction_failed`, `extracted`, and `extracted_empty`). `menu_found` means a candidate URL was discovered but its contents have not been parsed.

## Dietary and nutrition provenance

Dietary values use language-independent IDs: `vegan`, `vegetarian`, `gluten_free`, `dairy_free`, `nut_free`, `halal`, `kosher`, `organic`, `high_protein`, `low_carb`, `keto`, `low_calorie`, `plant_based`, `sugar_free`, and `no_added_sugar`. Each tag retains the restaurant's original label where available, a source type (`restaurant_claim`, `menu_label`, `menu_description`, `website_metadata`, or `inferred`), source URL, and confidence. Explicit restaurant claims are preferred; labels are not safety guarantees.

Nutrition is included only when the restaurant explicitly publishes it. Every nutrition object uses `sourceType: "restaurant_published"` and may contain calories, protein, carbohydrate, fat, sodium, and serving-size text. Values are never estimated from ingredients, photos, similar meals, AI assumptions, or external nutrition databases.

## Responsible use and boundaries

The Actor extracts publicly available restaurant and menu information with source provenance. It does not provide medical, dietary, or allergen-safety advice. In particular, it does not guarantee allergen absence, cross-contamination safety, or suitability for a medical condition; users must verify claims with the restaurant.

Version 1 excludes OCR, PDF menu parsing, social scraping (including Instagram, Threads, and reviews), multi-location or multi-country runs, delivery-platform integrations, nutrition estimation, calorie estimation, price-change monitoring, scheduled monitoring, personal contact extraction, outreach generation, advanced lead scoring, and automatic publishing or pricing changes. Unsupported menu formats should become valid records with an explicit status in later phases rather than fail the run.

## Roadmap

Phase 3 adds official-site and menu-link discovery. Later phases add HTML menu extraction, published nutrition parsing, evidence-based healthy classification, reliability tests, and a London benchmark. See [BENCHMARK_LONDON.md](./BENCHMARK_LONDON.md) for current benchmark status.
