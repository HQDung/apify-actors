# Benchmark notes

## Phase 0 feasibility

The repository-level report [`docs/phase-0-feasibility.md`](../../docs/phase-0-feasibility.md) records the live Steam review/news endpoint findings and candidate default benchmark. The provisional default is App ID `646570` because it reached both seven-day periods in three review pages.

## Phase 1 onward

### Phase 1 foundation and Steam acquisition

The Phase 1 report is [`docs/phase-1-report.md`](docs/phase-1-report.md). The default local smoke processed App `646570` in 1.784 seconds, fetched 3 review pages, scanned 300 reviews, sampled 40 before and 40 after reviews, reached full/full coverage, and produced one collection-only dataset summary plus `GAME_646570_COLLECTION`.

Phase 2 onward will record test commands, review pages, scan/analyze counts, coverage, runtime, memory, warnings, and cloud results before the next implementation phase begins.

### Phase 2 patch detection and fallback

The Phase 2 report is [`docs/phase-2-report.md`](docs/phase-2-report.md). A live Dota 2 smoke fetched 20 news items, accepted the `Gameplay Patch 7.41e and Summer Scrub` announcement at confidence `1.00`, scanned 14 review pages, sampled 20 before and 20 after reviews, reached full/full coverage, and completed in 7.194 seconds. Fixture tests cover fallback when news is promotional, event-oriented, external, empty, or unavailable.

### Phase 3 shared-core analysis

The Phase 3 report is [`docs/phase-3-report.md`](docs/phase-3-report.md). The Actor test suite passed 12 files and 37 tests; repository shared-core tests passed 10 tests; lint, build, formatting, and schema validation passed. Deterministic fixture analysis confirmed positive-rate, gaming-theme, feature-request, language, negative-share, and capped-evidence aggregation. No network benchmark was repeated because this phase only adds local analysis over the already bounded collection.

### Phase 4 comparison and final report

The Phase 4 report is [`docs/phase-4-report.md`](docs/phase-4-report.md). The final default smoke produced one `ok` report for App `646570` in 1.496 seconds with 3 review pages, 300 scanned reviews, 40 before/40 after analyzed samples, full/full coverage, and no warnings. The local matrix also verified latest-patch fallback, custom-date comparison, two-game output, evidence suppression, and safe invalid-style input handling. The final runtime no longer publishes a collection snapshot.
