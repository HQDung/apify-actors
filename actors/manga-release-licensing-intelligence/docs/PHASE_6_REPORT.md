# Phase 6 report — retailer offers

Checked 2026-08-05.

## Acceptance result

| Criterion | Result | Evidence |
| --- | --- | --- |
| Retail collection disabled in Store auto-test input | Pass | `samples/input.default.json` sets `includeRetailOffers: false` |
| Enabling retail offers does not alter metadata matching | Pass | US/VN retail sample retained the same matched One Piece work IDs |
| Unmatched offers are excluded or explicitly marked | Pass | Fahasa live offer has `editionId: null` and `OFFER_UNMATCHED_EDITION` warning |
| Currency and stock fields normalize | Pass | Live Barnes & Noble USD/InStock and Fahasa VND/InStock signals parsed |
| Optional retailer failure does not fail the run | Pass | Adapters catch per-product failures and return partial results/warnings |

## Implemented

- Barnes & Noble ProductGroup/Product JSON-LD `@graph` parsing with ISBN-in-URL fallback and format-aware variants.
- Fahasa Product/Book JSON-LD `@graph` parsing with VND and stock normalization.
- Public product-route allowlists; no account/cart/checkout/search access.
- Tracking-URL and variant deduplication with per-run caps.
- Explicit `editionId: null` for offers that cannot be joined safely.
- Null-safe price summaries; missing price never becomes `Infinity`.
- Retail sample at `samples/input.retail.json`.

## Live evidence

The optional US/VN retail run produced two snapshots in 15 seconds, one Barnes & Noble offer, three Kim Đồng publisher-store offers, and one explicitly unmatched Fahasa offer. The run exited successfully.

Phase 6 acceptance passes. Proceed to Phase 7.
