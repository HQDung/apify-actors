# Kids Activities & Indoor Playground Intelligence

Discover kids’ activity venues globally, then enrich each venue with bounded official-website information. The Actor is useful for family travel products, activity directories, party marketplaces, location research, and lead-generation workflows.

## What it does

- Searches Google Maps for the selected venue types in each location.
- Keeps branches separate and removes duplicates produced by overlapping searches.
- Crawls at most the requested number of relevant official-site pages.
- Extracts deterministic evidence for ages, activities, pricing, amenities, booking, and rules.
- Classifies venue types from business names, source categories, and extracted activities rather than copying the discovery query.
- Uses stable English taxonomy IDs while preserving source-language text when requested.
- Supports English and Vietnamese search and extraction cues; the locale dictionary is extensible.

## Input

Use [sample-input.json](sample-input.json) as a starting point. Locations are plain strings; include the country name when a city or region could be ambiguous:

```json
{
  "locations": ["London, United Kingdom", "Ho Chi Minh City, Vietnam"],
  "venueTypes": ["indoor_playground", "soft_play_center", "trampoline_park"],
  "maxPlacesPerLocation": 10,
  "maxWebsitePagesPerPlace": 3,
  "includeWebsiteEnrichment": true,
  "includeReviews": false,
  "extractPricing": true,
  "extractAgeSuitability": true,
  "extractActivities": true,
  "extractAmenities": true,
  "extractBookingInfo": true,
  "preserveOriginalText": true,
  "sourceLanguages": ["auto"],
  "normalizedOutputLanguage": "en"
}
```

Duplicate locations are removed case-insensitively. The Actor normalizes each string internally and infers known country aliases for locale selection; when a country cannot be inferred, its normalized country code remains `null`.

Important controls are `maxPlacesPerLocation` (1–50), `maxWebsitePagesPerPlace` (1–10), and `maxReviewsPerPlace` (1–50). `maxPlacesPerLocation` is a hard output cap after deduplication. Set `includeWebsiteEnrichment` to `false` for inexpensive discovery-only runs.

The sample explicitly enables every deterministic extraction switch. This avoids accidentally benchmarking discovery alone when an existing Console input has those switches disabled.

## Output

Every emitted dataset item has `actorOutputSchemaVersion: 1`, a stable `venueId`, source metadata, contact and location fields, venue/activity taxonomies, enrichment fields, review insights, language metadata, and warnings. Unknown values are `null`; the Actor does not claim that a venue is safe for children. `safetyReviewSentiment` describes only review text when review data is available.

Venue types use name, source-category, and website-activity evidence. Pricing is assigned to child, adult, toddler, or family fields only when a nearby label identifies the audience; an unlabeled currency amount is not guessed. Age ranges likewise require suitability context, so a ticket-category heading such as `1–2 years` does not automatically become the venue-wide age limit.

Example abbreviated record:

```json
{
  "actorOutputSchemaVersion": 1,
  "venueId": "f4c5...",
  "name": "Example Kids Play Center",
  "venueTypes": [
    { "id": "trampoline_park", "confidence": 0.95 },
    { "id": "birthday_party_venue", "confidence": 0.78 }
  ],
  "pricing": {
    "currency": "GBP",
    "childPriceFrom": 12.5,
    "priceTextOriginal": "Children £12.50 per session"
  },
  "enrichment": {
    "officialWebsiteFound": true,
    "websiteEnrichmentStatus": "completed"
  }
}
```

## Local use

```bash
cd actors/kids-activities-playground-intelligence
npm install
cp sample-input.json storage/key_value_stores/default/INPUT.json
apify run
```

Run checks with `npm run lint && npm test && npm run build`. Validate the Console form with `apify validate-schema`.

## Limitations and responsible use

Google Maps markup and public website content can change. This MVP uses conservative deterministic extraction only and does not crawl PDFs, log in, book, infer legal compliance, or certify safety. Ambiguous age and price text remains `null`. The review taxonomy and aggregation logic are present, but live Google Maps review collection is not implemented; `includeReviews` therefore defaults to `false`. When no configured review source is available, output reports `reviewAnalysisStatus: "no_source_available"` and does not fabricate insights or reviewer data. Respect each source’s terms, robots policy, and applicable law. Pricing is normalized only to its ISO currency code; no conversion or historical tracking is performed.

## Benchmarks

See [BENCHMARK_NOTES.md](BENCHMARK_NOTES.md) for measured cloud-run results, identified limitations, and the remaining publication checks.

## Cost control

Start with one location, 10 places, and three website pages. Website enrichment is bounded per venue; a failed site leaves the basic discovered record intact. Enable an Apify Proxy only when needed for your source access and account configuration.
