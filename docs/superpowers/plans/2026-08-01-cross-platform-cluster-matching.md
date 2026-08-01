# Phase 6 plan: cross-platform cluster matching

## Objective

Match semantically compatible Android and iOS clusters within the same explicit product using explainable signals and cautious evidence classifications.

## Implementation

1. Generate candidate pairs only when product ID and feedback type match.
2. Score topic overlap, canonical-issue token overlap, and severity compatibility.
3. Greedily select one-to-one pairs above the configured shared-confidence threshold.
4. Emit shared, platform-dominant, platform-specific, or insufficient-evidence comparison records with validation.
5. Preserve pair IDs, reasons, cluster provenance, and collected-sample wording.
6. Wire comparisons and comparison counts into the Actor and synchronize schemas/docs/samples/benchmark notes.

## Acceptance criteria

- Equivalent same-product clusters can produce a validated shared comparison.
- Feature requests do not match bug reports; generic sentiment alone cannot match clusters.
- Different products are never compared.
- Missing source data produces insufficient-evidence warnings.
- Platform-specific findings state only what was observed in the collected sample.
