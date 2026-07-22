# Benchmark notes

## QuickBooks local live smoke — 2026-07-19

Input: New York, QuickBooks only, one result, proxy disabled, website enrichment disabled.

| Metric             | Result |
| ------------------ | -----: |
| Search jobs        |      1 |
| Directory items    |      1 |
| Profiles fetched   |      1 |
| Unique firms       |      1 |
| Results pushed     |      1 |
| Source failures    |      0 |
| Completeness score |     90 |

The emitted PL Accounting Solutions LLC record included the public advisor name, full US address, canonical website/domain, published business email, services, industries, four explicit QuickBooks certifications, three languages, profile provenance, and flat Overview fields. This was a smoke test, not a cost benchmark.

### Current blockers

- Xero's public UK directory shell loaded, but the advisor search component exposed neither results nor a stable public response during browser validation.
- QuickBooks currently reads the first rendered result page only and assumes US profile address formatting.
- Website enrichment is not implemented, so its input flag currently leaves directory-only output.

## Planned benchmarks

Planned benchmark inputs:

1. London, Xero, 20 results, website enrichment enabled.
2. New York, QuickBooks, 20 results, website enrichment enabled.
3. Sydney and Singapore, both sources, 50 results, website enrichment disabled.

Record runtime, compute cost, leads found, unique leads, merge count, website success rate, email rate, contact rate, and source failure rate. Validate the Actor before any benchmark. Do not publish or change pricing automatically.
