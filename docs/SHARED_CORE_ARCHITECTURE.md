# Shared Feedback Analysis Core Architecture

Date: 2026-08-01

## Current implementation boundary

`packages/feedback-analysis-core` owns source-neutral contracts and taxonomy
configuration. The Steam Actor owns collection and output compatibility. Its
`src/core/steam-contract-adapter.js` converts a published Steam review record
to `NormalizedFeedback` and supplies the Steam taxonomy extension.

```text
Steam API response
  -> Steam output record (existing contract)
  -> Steam contract adapter
  -> NormalizedFeedback
  -> shared analysis/clustering/aggregation engines
  -> Steam-compatible output mapper
```

The current Phase 3 bridge validates the existing Steam analysis object through
the shared analysis validator while retaining its published shape. This allows
contract extraction without a field rename.

## Package boundary

The core public entry point is
`packages/feedback-analysis-core/src/index.js`. Source adapters must import
that entry point only; internal core paths are not part of the API. The core
does not import `apify`, source adapters, or Actor storage APIs.

The existing Apify Docker build is Actor-local, so the relative development
bridge is not yet a cloud packaging solution. Phase 6 must produce and pin an
explicit core package artifact before any cloud migration or publication.

## Compatibility rules

- Steam `game`, `review`, `author`, and `source` fields remain unchanged.
- Steam topic and feedback-type IDs remain accepted through a taxonomy extension.
- Shared contracts use product-neutral `productId` and `productType` fields.
- Missing source metadata remains `null`.
- Analysis errors remain record-level and never suppress raw review output.
