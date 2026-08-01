# Phase 12 plan — Release Impact mode

1. Add an explicit release-impact input mode with app release version/date and configurable before/after windows.
2. Reuse the Phase 11 comparison engine while preserving review-date boundaries and per-app isolation.
3. Add structured warnings for future release dates and insufficient before/after data.
4. Add tests for edge dates, empty windows, new/increasing/decreasing topics, and version-specific signals where source metadata exists.
5. Update README, input/output/dataset schemas, sample input, benchmark notes, changelog, and phase report together.
6. Run unit tests, lint, formatting, schema validation, diff checks, and a live smoke before closing the phase.
