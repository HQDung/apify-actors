# Auto-test contract

Phase 1 uses `samples/input.default.json` as the exact Store auto-test input.

The run must resolve `One Piece` through a public metadata provider, push exactly one `titleMarketSnapshot` for `US-en`, and write `RUN_SUMMARY` and `CHANGE_REPORT` key-value records. The default input does not enable retailer collection and sets `useApifyProxy` to `false`.

The implementation has a 180-second soft deadline and a 240-second hard deadline. It does not fabricate a record when metadata resolution fails. Publisher licensing/availability enrichment is enabled for the tested US/Vietnam adapters; retailer and release-gap enrichment remain opt-in, and change detection remains disabled by default.

Source policy remains permission-gated according to the Phase 0 compliance report; this local implementation is not an authorization or a publication action.
