# Combined-source minimum results design

## Goal

Prevent low global result caps from disproportionately excluding the source that runs later during combined Xero and QuickBooks validation.

## Behavior

- Validate and deduplicate `sources` before normalizing `maxResults`.
- When both `xero` and `quickbooks` are selected, raise any requested `maxResults` below 14 to 14.
- Preserve requested limits of 14 or greater.
- Preserve all valid limits for single-source runs, including values below 14.
- Report the normalized value through `summary.effectiveInput.maxResults` so the adjustment is visible.

## Public contract

- Change the input-schema default and combined-source sample input from 10 to 14.
- Explain automatic combined-source normalization in the README.
- Keep the output schema aligned by describing the summary as containing effective normalized input.
- Update benchmark notes to use 14 or more for combined-source validation and retain the observed 2026-07-23 cloud metrics.

## Testing

- Verify a combined-source request for 10 becomes 14.
- Verify a combined-source request for 14 remains 14.
- Verify a single-source request for 10 remains 10.
- Run lint, unit tests, build, formatting, schema validation, and `git diff --check`.

## Non-goals

- Do not change source execution order or implement per-source quotas.
- Do not enable website enrichment or contact extraction.
- Do not publish, push, or change pricing automatically.
