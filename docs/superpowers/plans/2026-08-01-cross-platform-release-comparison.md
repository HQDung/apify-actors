# Phase 9 plan: version and release-window comparisons

## Objective

Compare Android and iOS feedback around independently dated releases using non-overlapping windows, explicit version metadata, and observational wording.

## Implementation

1. Build before/after windows separately for each platform release.
2. Reuse the shared window comparison core for topic changes, new issues, and possible regressions.
3. Track staggered release timing and missing app-version metadata.
4. Add minimum release-window sample warnings and a non-causal disclaimer.
5. Emit per-product release reports and stable key-value records.
6. Synchronize input/output/dataset schemas, samples, README, benchmark notes, and changelog.

## Acceptance criteria

- Before and after windows do not overlap.
- Android and iOS releases retain separate dates and versions.
- Staggered rollout timing is reported.
- Insufficient review counts and missing app versions produce structured warnings.
- Report language remains observational and traceable.
