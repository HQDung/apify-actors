# Phase 11 plan: quality benchmark

## Objective

Measure comparison accuracy, schema validity, dimensions, release windows, runtime, memory, and fixture provider cost using a reproducible labeled dataset.

## Implementation

1. Build a 100-review fixture with shared, platform-specific, and feature-request labels.
2. Run the real analysis, platform clustering, comparison, report, and release-report functions.
3. Calculate precision, recall, false-positive, coherence, dimension, and window metrics.
4. Record runtime, memory, token usage, and estimated fixture cost.
5. Add a test and a repeatable `benchmark:quality` command.

## Acceptance criteria

- Shared precision and recall meet the 85% target.
- Platform-specific false-positive rate is at or below 10%.
- No cross-product matches occur.
- Analysis, dimensions, release windows, and schemas remain valid.
- Live source limitations are clearly separated from fixture quality results.
