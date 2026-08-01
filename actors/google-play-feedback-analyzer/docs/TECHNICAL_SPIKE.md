# Google Play Technical Spike

Captured 2026-08-01 against the public Google Play Store page for three representative apps:

| App class | Package | Markets tested | Direct HTML result | Review fields observed |
| --- | --- | --- | --- | --- |
| Global large | `com.google.android.youtube` | `en-US`, `vi-VN`, `en-GB` | HTTP 200; roughly 1.30–1.34 MB | ID, star rating, localized date, text, helpful count |
| Vietnam-focused | `com.zing.zalo` | `en-US`, `vi-VN`, `en-GB` | HTTP 200; roughly 1.29 MB | Same fields; locale changes visible review text/date |
| Smaller global | `com.todoist` | `en-US`, `vi-VN`, `en-GB` | HTTP 200; roughly 1.28–1.29 MB | Same fields plus developer replies in sampled cards |

## Collection paths tested

1. **Public Store HTML — selected for Phase 8.** A normal GET returned the app page and three unique review cards in the server-rendered HTML for every matrix case. The cards expose stable semantic anchors (`header[data-review-id]`, rating-star classes, date and review-text containers) and optional reply blocks. English pages expose a “See all reviews” control; the Vietnamese pages returned localized content and did not expose that exact English label. The raw fixtures retain only IDs, numeric fields, lengths, and text digests; names, text, avatars, and HTML were omitted.
2. **Browser expansion — viable fallback.** Playwright can open the public “See all reviews” dialog on English pages and expose additional cards. The control and dialog are localized, so selectors must be semantic and locale-aware. This path is slower and more fragile than direct HTML and should be enabled only when the requested review count exceeds the server-rendered sample.
3. **Legacy `batchexecute` review RPC — rejected as a primary source.** The request shape used by older open-source clients returned HTTP 200 but no review payload during this spike. The endpoint depends on changing server build/session parameters, so hard-coding it would create an unstable production contract.
4. **Google Play Developer API — not suitable for arbitrary public apps.** The official reviews API is app-owner scoped, requires OAuth with the Android Publisher scope, and is intended for the developer’s own review workflow. It remains a future authenticated adapter, not the default public collector.

## Contract and limitations

- Request inputs must include package ID, `hl` language, `gl` country, maximum review count, sort mode, and collection mode (`html` or `browser` fallback).
- The public page currently supplies a small server-rendered sample. Do not describe it as complete review history.
- Review ordering is observed as “Most relevant” by default. The browser dialog exposes sort controls, but pagination and internal request shapes are not stable enough to promise unlimited extraction yet.
- Locale affects review language, translated dates, labels, and whether the English control text is present. Parse rating stars structurally rather than from English aria-label text.
- Developer replies are optional and appear as a separate block. App version and device metadata were not consistently exposed in the sampled public HTML and must remain nullable until a later fixture proves otherwise.
- Public Store HTML is untrusted input. Strip markup, bound text length, validate star ratings, deduplicate by review ID, rate-limit requests, and avoid storing reviewer identity unless explicitly requested.

## Recommendation

Build Phase 8 around a bounded HTTP collector for public Store HTML, with an opt-in Playwright fallback for the “See all reviews” dialog. Keep the collector provider-neutral and return raw source records plus collection diagnostics. Do not use the legacy RPC as a hidden dependency. Add authenticated Developer API support only as a separate, explicitly configured source for app owners.

The official API details are documented by Google in [reviews.list](https://developers.google.com/android-publisher/api-ref/rest/v3/reviews/list?hl=en), [the Reviews resource](https://developers.google.com/android-publisher/api-ref/rest/v3/reviews?hl=en), and [Reply to Reviews](https://developers.google.com/android-publisher/reply-to-reviews?authuser=2&hl=en).
