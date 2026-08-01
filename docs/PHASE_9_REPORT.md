# Phase 9 Report — Google Play Normalized Source Contract

## Result

Phase 9 passed. Google Play review records now carry a source-neutral `normalizedFeedback` object validated by shared feedback-analysis core v1. Collection diagnostics include a stable source URL and collection timestamp, and the deferred browser fallback is explicit rather than silently ignored.

## Verification

- `npm test`: 12 tests passed, including the technical-spike fixture suite.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run validate:schema`: passed.
- `apify run --purge --input-file sample-input.json`: passed.
- Live smoke: 1 app, 3 normalized review records, 1 source diagnostic, 0 errors, 4 total records, 568 ms.
- Live normalized sample: `productType: "app"`, `productId: "com.todoist"`, `source.platform: "google-play"`, rating 2, parsed English date, source URL, and `collectedAt`.

## Contract decisions

- Google Play-specific raw fields remain available for source fidelity.
- Core-facing fields are under `normalizedFeedback`; unknown version, device, and app name remain `null`.
- English and Vietnamese date text map to canonical UTC midnight timestamps when the public date shape is recognized; unknown date text remains `null`.
- `rating >= 4` maps to positive, `rating <= 2` maps to negative, and 3-star reviews map to `null`.
- `useBrowserFallback: true` returns `GOOGLE_PLAY_BROWSER_FALLBACK_DEFERRED` until a later phase proves a stable browser implementation.

## Phase 10 handoff

Connect `normalizedFeedback` to the shared analysis engine with a Google Play taxonomy and deterministic fallback behavior. Keep the default Actor path safe when no AI provider is configured.
