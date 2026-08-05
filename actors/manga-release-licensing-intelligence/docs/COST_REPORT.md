# Cost and runtime report

Checked 2026-08-05.

## Observed default path

- Ten local default runs used no Apify Proxy, secret, or authenticated source.
- Wall time ranged from 4.53 to 8.05 seconds; the maximum was well below the 120-second target and 240-second hard limit.
- OS-level final validation measured 257,048,576 bytes maximum resident set size (about 245 MiB) and 228,084,224 bytes peak memory footprint.
- Each run produced one dataset snapshot plus `RUN_SUMMARY` and `CHANGE_REPORT`.
- Retailer collection is opt-in and disabled in the default path.

## Cost controls

- Per-request timeouts and exponential retries bound source work.
- Per-source circuit breakers stop repeated failures from multiplying requests.
- Soft/hard deadlines prevent optional enrichment from extending the run indefinitely.
- No pricing is changed automatically and no publication action is performed automatically.

Apify Cloud billing was not estimated from local wall time; production cost depends on the selected Actor resource plan, network latency, and optional source settings. A pricing decision remains outside this implementation.
