# Phase 9 report — error handling and runtime hardening

Checked 2026-08-05.

## Acceptance result

| Criterion | Result | Evidence |
| --- | --- | --- |
| One title failure does not lose other title results | Pass | Hardening test resolves the second title after the first returns no metadata and verifies one snapshot is pushed. |
| Optional sources cannot block shutdown | Pass | Requests have bounded timeouts, the hard deadline abort signal is propagated, and optional enrichment remains non-fatal. Default run exited 0 in 6 seconds. |
| Logs identify source adapter and title | Pass | Source failure summaries retain `sourceName`, `queryTitle`, market, code, and message; the test asserts VIZ/One Piece context. |
| Auto-test does not silently push fabricated data | Pass | Metadata failure still yields `TITLE_NOT_FOUND`; only successfully resolved works are pushed. |
| Retry and backoff are bounded | Pass | Existing retry tests pass; retry delays remain exponential and request timeouts are typed as `REQUEST_TIMEOUT`. |
| Repeated source failures are isolated | Pass | Per-source circuit-breaker test verifies open, blocked, and reset states. |

## Implemented

- Typed Actor/source errors for input, timeout, rate-limit, deadline, circuit, and run-failure paths.
- Timeout classification without logging response bodies or full HTML.
- Hard-deadline abort propagation through metadata, publisher, and retailer requests.
- Per-source circuit-breaker registry wired to all network adapters, with one retry layer for metadata recovery so circuits do not trip on nested attempts.
- Source failure aggregation in `RUN_SUMMARY` with title and source context.
- Incremental snapshot pushes and partial optional-source behavior preserved.

Phase 9 acceptance passes. Proceed to Phase 10.
