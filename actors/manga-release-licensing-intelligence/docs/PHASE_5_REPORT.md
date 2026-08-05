# Phase 5 report — Vietnam licensing and official availability

Checked 2026-08-05.

## Acceptance result

| Criterion | Result | Evidence |
| --- | --- | --- |
| Vietnamese titles match canonical works | Pass | Live `Đảo Hải Tặc` run matched Kitsu work `38` via a vetted localized alias |
| VND prices remain numeric with `currency: "VND"` | Pass | Kim Đồng fixture normalizes `180000` and `VND` |
| Vietnamese labels are preserved | Pass | `One Piece - Tập 110 - Bản đặc biệt` remains the source title and latest volume label |
| US and Vietnam use separate adapters | Pass | VIZ and Kim Đồng have separate source modules and allowlists |

## Implemented

- Kim Đồng public category/product adapter with private-route and image-route rejection.
- Vietnamese `Tập` volume parsing, ISBN normalization, publisher provenance, VND price, and official stock status.
- Publisher-store offer records remain separate from retailer adapters.
- Vetted localized aliases for provider responses that omit Vietnamese title fields; unrelated candidates remain ambiguous.
- US/Vietnam integration sample at `samples/input.us-vn.json`.

## Live evidence

The combined `Đảo Hải Tặc` US/VN run produced two snapshots in 6 seconds. The VN path resolved the canonical One Piece work and completed Kim Đồng enrichment without proxy or secret.

Phase 5 acceptance passes. Proceed to Phase 6.
