# Implementation handoff

## Implemented MVP

The Actor reuses the repository’s Playwright Google Maps pattern, Apify proxy context creation, retry-tolerant partial-results approach, and browser lifecycle. It adds global English/Vietnamese term dictionaries, normalized taxonomies, validation, bounded official-site page selection, deterministic extraction, branch-safe deduplication, nullable output assembly, fixtures, and unit tests.

## Deliberate decisions

- JavaScript runtime is retained to match the reusable template; `src/types/input.ts` and `src/types/output.ts` document the public TypeScript contracts without introducing a compiler dependency.
- Official-site crawling is limited to same-domain, prioritized links plus the homepage.
- Public location input uses a simple string list. Validation trims and deduplicates queries, then creates internal `{ query, countryCode }` records; unrecognized country aliases remain `null`.
- Review schema and classifier are implemented, but Google Maps review loading is intentionally not enabled in this first local benchmark because Maps’ dynamic review dialog is volatile. Output reports `no_source_available` instead of fabricating insights.
- Venue classification ranks business-name, Google category, and extracted-activity evidence. Discovery terms are retained only as a low-confidence fallback.
- Price extraction maps amounts only when nearby English or Vietnamese text identifies child, adult, toddler, or family pricing. Unlabeled currency tokens remain null.
- Age extraction requires venue-suitability context instead of promoting the first bare age range found on a page.

## Benchmark notes

Three cloud benchmarks are recorded in `BENCHMARK_NOTES.md`. Build `0.1.4` confirmed exact per-location caps, bilingual website enrichment, partial-result persistence, and original-text preservation. It also exposed search-term-only venue classification and context-free age and pricing assignment; both are corrected locally with regression coverage.

## Next step before publishing

Build and rerun `sample-input.json` in the cloud. Manually verify evidence-based venue types and labeled age/pricing fields in both languages, then record the post-fix metrics. Add stable source-specific review collection before enabling review analysis or advertising live review insights.
