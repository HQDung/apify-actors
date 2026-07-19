# Benchmark notes

## Contextual enrichment cloud run — 2026-07-18

Apify run `bRsT6q3hqjIqCUaQZ`, build `0.1.4`, used the complete `sample-input.json` with all deterministic extraction switches enabled.

| Metric                       |                 Result |
| ---------------------------- | ---------------------: |
| Run status                   | Succeeded, exit code 0 |
| Runtime                      |   3 minutes 41 seconds |
| Run cost                     |                 $0.051 |
| Peak memory                  |               633.8 MB |
| Venues emitted               |                     20 |
| London / Ho Chi Minh City    |                10 / 10 |
| Official websites found      |            14/20 (70%) |
| Website enrichment completed |            13/20 (65%) |
| Records with activities      |            12/20 (60%) |
| Records with pricing         |             7/20 (35%) |
| Records with age evidence    |             8/20 (40%) |
| Records with booking URLs    |            12/20 (60%) |
| Original names preserved     |           20/20 (100%) |
| Runtime validation failures  |                      0 |

All 10 London websites completed enrichment. In Vietnam, three websites completed, six venues had no official website, and one supplied domain failed DNS without discarding the venue. Every successfully crawled Vietnamese website produced normalized activities; two produced contextual age evidence.

### Findings and local correction

- Output classification used discovery terms, causing all 20 records to be labeled `indoor_playground`. Local classification now ranks business-name, Google category, and extracted-activity evidence; search terms are only a low-confidence fallback.
- Pricing assigned the first currency token to `childPriceFrom` and assumed `per_session`. Local extraction now requires a nearby child, adult, toddler, or family label, detects an explicit unit when present, handles VND thousands separators, and leaves ambiguous values null.
- Age extraction accepted the first bare range, which could turn a ticket tier such as `1–2 Years` into a venue-wide limit. Local extraction now requires explicit suitability context.
- Regression coverage increased from 9 to 15 focused unit tests, including punctuation, ticket-context, provenance, and irrelevant-result cases. A post-fix cloud benchmark is still required before publication.

## London and Ho Chi Minh City cloud run — 2026-07-18

Apify run `0EHlrf3PD5NLxoRno`, build `0.1.3`, used the two sample locations, three venue types, and `maxPlacesPerLocation: 10`.

| Metric                         |                 Result |
| ------------------------------ | ---------------------: |
| Run status                     | Succeeded, exit code 0 |
| Runtime                        |   3 minutes 26 seconds |
| Run cost                       |                 $0.047 |
| Peak memory                    |               648.1 MB |
| Venues emitted                 |                     20 |
| London / Ho Chi Minh City      |                10 / 10 |
| Apparent selected-type matches |            19/20 (95%) |
| Accidental duplicate observed  |              0/20 (0%) |
| Runtime validation failures    |                      0 |

The hard per-location cap is fixed: the run emitted exactly 10 venues for each location. Two records named `Khu Vui Chơi Trẻ Em HAPPY KIDS` had different addresses and were correctly retained as separate branches. `Outdoor Playground - Gia Dinh Park` was the one apparent off-taxonomy result for the selected indoor-oriented venue types.

### Benchmark limitation

The resolved cloud input set `extractPricing`, `extractAgeSuitability`, `extractActivities`, `extractAmenities`, `extractBookingInfo`, and `preserveOriginalText` to `false`. Consequently, all 20 records had empty activities and `nameOriginal: null` by configuration. This run validates bilingual discovery, caps, basic output persistence, and branch handling; it does **not** validate deterministic enrichment quality. `sample-input.json` now sets these switches explicitly to `true` so the publication-gate rerun cannot silently become discovery-only.

## London cloud run — 2026-07-18

Apify run `fwyDVyl4wGxsgONhn`, build `0.1.2`, used `London, UK`, three selected venue types, website enrichment enabled, review analysis requested, and `maxPlacesPerLocation: 5`.

| Metric                       |                 Result |
| ---------------------------- | ---------------------: |
| Run status                   | Succeeded, exit code 0 |
| Runtime                      |    1 minute 23 seconds |
| Run cost                     |                 $0.019 |
| Peak memory                  |               772.9 MB |
| Venues emitted               |                      6 |
| Visually relevant venues     |             6/6 (100%) |
| Duplicate records observed   |               0/6 (0%) |
| Official websites found      |             6/6 (100%) |
| Website enrichment completed |             6/6 (100%) |
| Website pages crawled        |          2–5 per venue |
| Records with activities      |             6/6 (100%) |
| Review analysis completed    |               0/6 (0%) |
| Runtime validation failures  |                      0 |

The six venues were Gambado Chelsea, Topsy Turvy World, Kidzmania, Discovery Planet, The London Play Den, and Flip Out Canary Wharf. A spot check of Gambado produced normalized `soft_play`, `sensory_play`, `toddler_zone`, and `birthday_party` activities with original English labels.

### Findings

- The run exceeded `maxPlacesPerLocation: 5` because all six cards from one Google Maps DOM batch were inserted before the loop rechecked the limit. A regression test now reproduces this, and discovery stops inserting new cards at the configured cap.
- Every record identified an official website and completed bounded enrichment without warnings.
- Review analysis returned `no_source_available` for every record because live Google Maps review collection is not implemented. `includeReviews` now defaults to `false` so the Store input does not imply unavailable functionality.
- The Console view showed valid normalized records, but this run did not measure age or pricing accuracy against source truth.

## Publication gate

Do not treat these runs alone as publication-ready. Before publishing:

1. Push the contextual classification and extraction fix, then rerun `sample-input.json`.
2. Confirm trampoline and soft-play venues receive evidence-based taxonomy IDs instead of only `indoor_playground`.
3. Verify labeled pricing and contextual age extraction manually against source pages for both languages; ambiguous values must remain null.
4. Confirm zero schema-invalid records in the post-fix enrichment run.
5. Keep review analysis disabled and avoid advertising live review collection until a stable review source is implemented.
