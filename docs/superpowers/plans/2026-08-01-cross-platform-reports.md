# Phase 7 plan: per-product reports and aggregate summaries

## Objective

Produce validated per-product cross-platform reports from raw reviews, analysis records, platform clusters, and comparison records, with statistics and partial-source warnings.

## Implementation

1. Aggregate collected review counts and average ratings separately by platform.
2. Count actionable analyzed reviews and place shared/platform-specific comparisons into report sections.
3. Calculate rating, volume, and actionability differences.
4. Add country, language, and version dimension summaries as report inputs for later richer comparisons.
5. Emit missing-source and source-failure warnings.
6. Validate reports against the cross-platform report contract and store per-product reports in key-value storage.
7. Synchronize schemas/docs/samples/benchmark notes and verify the full Actor lifecycle.

## Acceptance criteria

- Reports validate with both platforms present or with explicit missing-platform warnings.
- Report statistics reconcile with raw platform records and analyses.
- Shared and platform-specific findings remain traceable to comparison records.
- Reports are available through stable per-product key-value keys.
