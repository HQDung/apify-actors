# Phase 10 plan: schemas, errors, and runtime safeguards

## Objective

Finalize the cross-platform Actor’s schemas and runtime failure behavior so partial source failures remain visible, expanded requests are bounded, and stored outputs are structurally validated.

## Implementation

1. Add a hard request-expansion cap to normalized input.
2. Validate source diagnostics, run errors, and runtime statistics before persistence.
3. Complete dataset-view fields and remove duplicate schema definitions.
4. Verify vendored dependency packaging and synchronized public artifacts.
5. Run Actor, core-package, schema, format, and local-runtime checks.

## Acceptance criteria

- Request explosions fail before network collection with a stable error code.
- Source errors are preserved in `SOURCE_ERRORS` and dataset records.
- `RUN_STATS` rejects malformed counters before persistence.
- Dataset/output schemas parse and validate.
- All phase checks pass before benchmark work begins.
