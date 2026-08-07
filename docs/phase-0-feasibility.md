# Phase 0 Feasibility — Game Patch Impact & Player Sentiment Intelligence

Date: 2026-08-07

## Scope

This phase audited the existing Steam Actor, the shared feedback-analysis core, Apify packaging conventions, and the public Steam review/news endpoints. No new Actor implementation was started.

## Shared core integration decision

Reuse `packages/feedback-analysis-core` through the existing vendored package flow:

- Import source-neutral contracts and analysis utilities from `@project/feedback-analysis-core`.
- Package the canonical workspace core with `scripts/package-feedback-core.mjs` into the new Actor's `vendor/` directory.
- Add a thin Steam adapter that maps Steam records to `validateNormalizedFeedback`'s source-neutral contract.
- Keep patch-impact comparison, coverage, deterministic Steam recommendation deltas, gaming taxonomy mapping, and report formatting in the new Actor. Do not duplicate or fork the shared core.

The existing `actors/steam-game-feedback-analyzer` proves this dependency path and provides reusable Steam field knowledge, fixtures, retry conventions, and taxonomy signals. Its product/output contract is raw review analysis, so the new Actor should remain a separate orchestration/report Actor rather than extending that Actor's input/output surface.

## Steam endpoint findings

### Reviews

Endpoint tested:

```text
GET https://store.steampowered.com/appreviews/<appid>?json=1&filter=recent&language=english&review_type=all&purchase_type=all&num_per_page=100&cursor=...
```

Observed behavior:

- HTTP 200 responses returned `success`, `query_summary`, `reviews`, and `cursor`.
- Pages returned 100 reviews in all benchmark pages.
- Reviews were ordered newest-first by `timestamp_created`.
- Cursor values must be URL-encoded; the existing Steam client already does this with `URLSearchParams`.
- The response provides enough timestamp data to assign reviews to before/after windows while scanning backward.
- `filter=recent` is usable for bounded chronological collection, but high-volume games can require many pages before the requested historical boundary is reached.

### News

Endpoint tested:

```text
GET https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=<appid>&count=20&maxlength=0
```

Observed behavior:

- The public endpoint returned HTTP 200 and `appnews.newsitems` with 20 items for all three candidates.
- Items included title, Unix publication date, and public URL.
- Steam Community Announcement URLs and external publisher URLs both occurred in the feed.
- The patch detector must use title/content signals and source heuristics; it must not assume every news item is a patch or rely on undocumented tags.
- News failure must remain non-fatal and trigger the documented rolling-window fallback.

## Candidate benchmark

Measured at `2026-08-07T08:15:09.710Z` with `windowDays=7`, English reviews, 100 reviews per page, and a hard limit of 30 review pages. The counts below are eligible reviews observed while scanning, before the Phase 1 deterministic per-period sample cap.

| App ID | Candidate | Review pages | Review requests | News requests | Scanned reviews | Reached 14-day start | Before candidates | After candidates | Elapsed |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| `646570` | Slay the Spire | 3 | 3 | 1 | 300 | yes | 101 | 105 | 2.006 s |
| `570` | Dota 2 | 14 | 14 | 1 | 1,400 | yes | 671 | 695 | 10.218 s |
| `730` | Counter-Strike 2 | 30 (limit) | 30 | 1 | 3,000 | no | 0 | 3,000 | 15.461 s |

Review timestamp ranges observed:

- `646570`: `2026-07-16T20:03:11.000Z` through `2026-08-06T21:44:12.000Z`.
- `570`: `2026-07-23T22:04:18.000Z` through `2026-08-07T07:04:36.000Z`.
- `730`: `2026-08-04T08:12:12.000Z` through `2026-08-07T07:28:14.000Z`; the requested boundary was not reached.

## Chosen default App ID

Choose `646570` (Slay the Spire) for the safe Store-test default.

Reason:

- It reached both requested 7-day periods in only 3 review requests.
- It provided more than the default 40 eligible reviews for each period in the benchmark.
- It completed substantially faster than `570` and did not hit the page limit like `730`.
- Its latest news feed is stable and public, while patch detection can still demonstrate the required fallback behavior when no high-confidence patch is found.

The default `recent_vs_previous` run needs 3 review requests plus one best-effort metadata request. It does not need a news request. `latest_patch` adds one bounded news request.

## Adapter interface decision

Use four small boundaries:

```text
fetchReviewPage(appId, options) -> SteamReviewPage
iterateRecentReviews(appId, options) -> ReviewCollection
normalizeSteamReview(raw, context) -> NormalizedGameFeedback
fetchGameNews(appId, options) -> SteamNewsItem[]
```

`ReviewCollection` must carry the bounded scan counters, cursor/page-limit state, oldest/newest observed timestamps, and raw normalized records needed to calculate `PeriodCoverage`. The collector remains responsible for chronological scanning and period assignment; the analysis layer receives only normalized feedback grouped into BEFORE and AFTER samples.

## V1 architecture decision

Build a new JavaScript Actor under `actors/game-patch-impact-player-sentiment` following the repository's existing Apify Actor conventions:

```text
Steam reviews/news HTTP adapters
        -> bounded chronological collection
        -> source-neutral core adapter
        -> independent before/after analysis
        -> deterministic sentiment/theme comparison
        -> coverage-aware report builder
        -> one dataset report per App ID
```

Use the Apify SDK and `fetch`; do not add Playwright, an external LLM, a user secret, or proxy requirements. Keep all scan/retry/concurrency limits finite and make partial coverage a first-class output state.

## Known risks

- Steam's `recent` feed is not an arbitrary time-range API; very high-volume games can exhaust the page limit before reaching the older period.
- A fixed 30-page cap is safe operationally but can produce partial or insufficient coverage for popular games. The report must lower confidence and emit warnings instead of overstating completeness.
- Steam news mixes first-party announcements and external articles, and a recent title may be a promotion or event rather than a patch.
- Steam language tags are source labels, not guaranteed text-language detection; `language=all` needs explicit confidence treatment.
- The existing core's generic topic taxonomy is mobile/source-neutral. Gaming categories should be a mapping/augmentation layer in the new Actor, not a shared-core fork.
- The benchmark is a live endpoint feasibility check, not a human-labeled accuracy evaluation.

## Phase 0 validation

Passed:

- Live Steam review pagination and timestamps verified for three candidates.
- Live Steam news endpoint verified for three candidates.
- Shared core unit suite: 10 passed, 0 failed.
- Shared core packaging test: 1 passed, 0 failed.
- Steam regression suite: 8 passed, 1 skipped live smoke, 0 failed.
- Existing Steam Actor unit suite: 48 passed across 14 files, 0 failed.
- Existing Steam Actor input, dataset, and output schemas validated by Apify CLI.

The repository helper `node scripts/validate-actor-files.js actors/steam-game-feedback-analyzer` is lead-scraper-specific and reports the expected missing `src/niche-config.js`; it is not the appropriate validator for this existing Steam Actor and is not counted as a Phase 0 failure.

## Phase 0 exit decision

Feasible. The shared-core import path is proven, Steam collection reaches both windows for the selected default, and the new Actor can proceed to Phase 1 with `646570` as its provisional default and a 30-page hard scan limit.

Phase 1 should begin only after review of this report and approval of the JavaScript adapter/report design.
