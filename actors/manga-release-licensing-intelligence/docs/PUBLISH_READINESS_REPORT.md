# Publish readiness report

Checked 2026-08-05.

## Local gate

| Check | Result |
| --- | --- |
| `npm install` | Pass; dependencies up to date, 0 vulnerabilities reported |
| `npm run lint` | Pass; 36 source files syntax-checked |
| `npm run typecheck` | Pass; JavaScript project, syntax/type contract check completed |
| `npm test` | Pass; 59 tests |
| `npm run build` | Pass |
| `npm run validate:schema` | Pass; input, dataset, and output schemas |
| Exact default input | Pass; one matched snapshot, non-empty dataset, reports written |
| US/Vietnam example | Pass; two matched snapshots in 7 seconds |
| Retail example | Pass; two snapshots, normalized USD/VND offers, explicit unmatched-offer warning |
| Change-detection example | Pass; `enabled: true`, one prior title compared, zero false changes |
| README/sample validation | Pass; all four JSON samples parse and Store contract tests pass |
| Peak memory | Recorded; 257,048,576 bytes maximum resident set size, about 245 MiB |

## External gate

Cloud repetition is pending. `apify info` could not resolve `api.apify.com` and exhausted repeated API attempts with `ENOTFOUND`. Therefore ten Apify Cloud default runs, Cloud output-link verification, and Cloud Store auto-test confirmation cannot be honestly marked complete in this environment.

Phase 0 source permission/terms review also remains a publication prerequisite. No Actor publish, pricing change, or external mutation was performed.

## Decision

Local implementation is ready for an authorized Cloud validation pass. Overall publication readiness is **not cleared** until Cloud access and source permission confirmation are available.
