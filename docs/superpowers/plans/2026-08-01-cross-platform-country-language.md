# Phase 8 plan: country and language intelligence

## Objective

Compare country and requested-language dimensions without conflating locale with reviewer origin or ranking tiny samples as meaningful platform differences.

## Implementation

1. Group raw reviews by country, requested source language, and app version while retaining platform separation.
2. Compute per-dimension review count, average rating, actionable count, and negative-topic signals.
3. Add configurable minimum dimension sample size and explicit `sufficient`/`limited` evidence status.
4. Preserve language attribution as requested store locale rather than inferred reviewer origin.
5. Wire dimension settings through the input schema, sample, report builder, and Actor.

## Acceptance criteria

- Country and language remain distinct report dimensions.
- Small samples are marked limited and not ranked as sufficient evidence.
- Platform-specific counts and ratings are traceable.
- Missing locale data is omitted rather than converted into a false comparison.
