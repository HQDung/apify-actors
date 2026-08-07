# Benchmark notes

## Phase 0 feasibility

The repository-level report [`docs/phase-0-feasibility.md`](../../docs/phase-0-feasibility.md) records the live Steam review/news endpoint findings and candidate default benchmark. The provisional default is App ID `646570` because it reached both seven-day periods in three review pages.

## Phase 1 onward

### Phase 1 foundation and Steam acquisition

The Phase 1 report is [`docs/phase-1-report.md`](docs/phase-1-report.md). The default local smoke processed App `646570` in 1.784 seconds, fetched 3 review pages, scanned 300 reviews, sampled 40 before and 40 after reviews, reached full/full coverage, and produced one collection-only dataset summary plus `GAME_646570_COLLECTION`.

Phase 2 onward will record test commands, review pages, scan/analyze counts, coverage, runtime, memory, warnings, and cloud results before the next implementation phase begins.
