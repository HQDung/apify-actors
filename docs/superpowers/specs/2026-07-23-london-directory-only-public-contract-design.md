# London directory-only public contract design

## Goal

Align the Actor's public contract with its validated implementation: Xero and QuickBooks directory leads for London, United Kingdom, without website enrichment.

## Canonical runtime input

- Remove `locations` from the public input schema and sample input.
- Ignore any API-supplied `locations` value and always normalize to `["London, United Kingdom"]`.
- Remove `enrichWebsites` from the public input schema and sample input.
- Reject `enrichWebsites: true` with a clear error that website enrichment is not implemented.
- Normalize omitted or false enrichment to `false`.
- Preserve source, result-limit, contact filtering, raw-data, and proxy behavior.
- Continue reporting canonical location and disabled enrichment through `summary.effectiveInput`.

## Public wording

- Describe the Actor as a London/United Kingdom beta, not a worldwide Actor.
- Update `.actor/actor.json`, input schema, output schema, dataset schema, README, Vietnamese summary, sample input, and benchmark notes together.
- Explain that locations are fixed to London and website values come only from directory profiles.
- Remove planned benchmarks for New York, Sydney, and Singapore until adapters for those locations exist.

## Validation and errors

- Existing clients may still send `locations`; values are ignored and canonical London is used.
- Existing clients may send `enrichWebsites: false`; it remains valid.
- `enrichWebsites: true` fails before source work begins with: `Website enrichment is not implemented. Remove enrichWebsites or set it to false.`

## Testing

- Verify missing locations produce canonical London.
- Verify a different supplied location is replaced with canonical London.
- Verify omitted and false enrichment normalize to false.
- Verify true enrichment is rejected with the documented message.
- Update pipeline expectations for the canonical effective input.
- Run lint, unit tests, build, formatting, Apify schema validation, and `git diff --check`.

## Non-goals

- Do not implement website crawling or enrichment.
- Do not change source adapters, pricing, publication status, or proxy behavior.
- Do not push or publish automatically.
