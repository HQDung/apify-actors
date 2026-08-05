# Phase 13 report — final publish readiness

Checked 2026-08-05.

## Acceptance result

| Criterion | Result | Evidence |
| --- | --- | --- |
| Required local commands pass | Pass | Install, lint, typecheck, 59-test suite, build, and schema validation all pass. |
| Default/local examples pass | Pass | Default, US/Vietnam, retail, and change-detection examples completed with expected snapshots/reports. |
| Runtime and memory are measured | Pass | Ten-run target max wall time 8.05 seconds; final OS-level run measured ~245 MiB peak memory footprint. |
| Cloud default run repeated ten times | Pending external access | `api.apify.com` DNS resolution failed after repeated CLI retries. |
| Cloud Store links and auto-test confirmed | Pending external access | Requires the same unavailable Cloud/API connection. |
| Publication authorization/permission gate | Pending external approval | Phase 0 source terms/permission remain explicitly unresolved. |

## Decision

The local Phase 13 gate passes. The overall publish gate remains pending, so Phase 14 publication/post-publish actions are intentionally not executed.
