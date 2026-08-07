# Benchmark notes

## Phase 0 feasibility

The repository-level report [`docs/phase-0-feasibility.md`](../../docs/phase-0-feasibility.md) records the live Steam review/news endpoint findings and candidate default benchmark. The provisional default is App ID `646570` because it reached both seven-day periods in three review pages.

## Phase 1 onward

### Phase 1 foundation and Steam acquisition

The Phase 1 report is [`docs/phase-1-report.md`](docs/phase-1-report.md). The default local smoke processed App `646570` in 1.784 seconds, fetched 3 review pages, scanned 300 reviews, sampled 40 before and 40 after reviews, reached full/full coverage, and produced one collection-only dataset summary plus `GAME_646570_COLLECTION`.

Phase 2 onward will record test commands, review pages, scan/analyze counts, coverage, runtime, memory, warnings, and cloud results before the next implementation phase begins.

### Phase 2 patch detection and fallback

The Phase 2 report is [`docs/phase-2-report.md`](docs/phase-2-report.md). A live Dota 2 smoke fetched 20 news items, accepted the `Gameplay Patch 7.41e and Summer Scrub` announcement at confidence `1.00`, scanned 14 review pages, sampled 20 before and 20 after reviews, reached full/full coverage, and completed in 7.194 seconds. Fixture tests cover fallback when news is promotional, event-oriented, external, empty, or unavailable.
