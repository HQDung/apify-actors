# London benchmark

Phase 3 website enrichment is implemented. A Phase 3 run discovers Google Maps places, crawls bounded official homepages, and records scored menu-link candidates without fetching menu contents. Nutrition and parsed-menu coverage remain intentionally zero until later phases.

The benchmark uses the documented [Phase 2 sample input](./sample-input-phase2.json) with `includeMenu: false` for discovery-only runs; the Phase 3 smoke input is [sample-input-phase3.json](./sample-input-phase3.json) with `includeMenu: true`.

Local Phase 3 smoke run (2026-07-27): 20 Google Maps cards discovered, 10 restaurants after deduplication, 10 records with website URLs, 0 detail failures, and menu statuses `website_unreachable: 5`, `menu_not_found: 2`, `menu_found: 3`. The run completed successfully and wrote 10 dataset records to local Apify storage. No menu contents were fetched or parsed.
