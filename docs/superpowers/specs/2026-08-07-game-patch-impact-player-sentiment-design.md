# Game Patch Impact & Player Sentiment Intelligence — Design

Date: 2026-08-07

## Goal

Build a JavaScript Apify Actor that collects bounded Steam review history for one to ten App IDs and produces one coverage-aware report per game comparing sentiment, issue themes, improvements, regressions, and feature requests across two periods.

## Scope

The V1 Actor supports `recent_vs_previous`, `latest_patch`, and `custom_patch_date` comparisons; English, all-language, and the documented Steam language codes; deterministic sampling; Steam recommendation-based sentiment; deterministic gaming taxonomy extraction; short evidence snippets; and resilient per-game partial failures.

The Actor does not collect Reddit, Metacritic, YouTube, Discord, dashboards, historical scheduled storage, raw-review exports as the primary output, browser pages, external LLM analysis, user API keys, or automatic competitor discovery.

## Architecture

The Actor is an orchestration and comparison layer over the public Steam review/news endpoints and the shared feedback-analysis core.

```text
Steam reviews + Steam news
        -> source adapters
        -> bounded chronological collection
        -> normalized source-neutral feedback
        -> independent BEFORE/AFTER analysis
        -> deterministic sentiment/theme comparison
        -> coverage/confidence-aware report
        -> one dataset item per App ID
```

The Actor lives at `actors/game-patch-impact-player-sentiment`. It uses the repository's JavaScript/Apify conventions, `fetch`, and the vendored `@project/feedback-analysis-core` package. It does not modify the existing generic Steam review Actor or fork the shared core.

## Components

- `src/config.js`: defaults and finite internal safety limits.
- `src/input/normalize-input.js`: runtime validation, defaults, and conditional `patchDate` validation.
- `src/adapters/steam-reviews.js`: URL construction, retries, cursor pagination, bounded chronological review collection, and Steam-to-domain normalization.
- `src/adapters/steam-news.js`: bounded news retrieval and source metadata normalization.
- `src/adapters/game-metadata.js`: best-effort Steam app-details enrichment.
- `src/core/feedback-core-adapter.js`: maps normalized game feedback to the shared core contract and invokes the core with a game-specific deterministic taxonomy fallback.
- `src/domain/comparison-window.js`: rolling/custom/patch window calculation.
- `src/domain/coverage.js`: period coverage state and warning generation.
- `src/domain/patch-detector.js`: patch candidate scoring and acceptance/fallback decision.
- `src/domain/sentiment-delta.js`: Steam recommendation rates and direction thresholds.
- `src/domain/theme-delta.js`: theme mention-rate, negative-share, new-issue, regression, and improvement calculations.
- `src/domain/confidence.js`: bounded 0..1 confidence calculation and labels.
- `src/domain/sampling.js`: deterministic bounded reservoir/even sampling with period-specific seeds.
- `src/services/collect-game-feedback.js`: collection orchestration for one game.
- `src/services/analyze-period.js`: independent period analysis and language/evidence aggregation.
- `src/services/analyze-game-impact.js`: comparison and report assembly for one game.
- `src/output/report-builder.js`: final schema-shaped report and short deterministic summary.
- `src/main.js`: Apify lifecycle, per-game isolation, dataset output, key-value run statistics, and high-level logs.

The game-specific fallback contains only gaming keyword rules and feature-request detection needed to map text into the canonical categories. Shared validation, analysis result contracts, confidence normalization, and source-neutral aggregation remain in `@project/feedback-analysis-core`.

## Input and window semantics

Runtime defaults are:

```json
{
  "steamAppIds": ["646570"],
  "comparisonMode": "recent_vs_previous",
  "windowDays": 7,
  "maxReviewsPerPeriod": 40,
  "language": "english",
  "includeOffTopicReviews": false,
  "includeEvidence": true
}
```

For `recent_vs_previous`, AFTER is `[now-W, now]` and BEFORE is `[now-2W, now-W)`. A review exactly at the boundary belongs to AFTER. For `custom_patch_date`, the same half-open rule uses `patchDate` as the boundary. For `latest_patch`, news candidates are accepted only at confidence `>= 0.65`; otherwise the Actor uses rolling periods and emits `PATCH_DETECTION_FALLBACK`.

The collector scans newest-first pages until it reaches the BEFORE start, Steam returns no reviews, the cursor repeats, or `MAX_SCAN_PAGES_PER_GAME=30` is reached. It continues scanning after finding enough AFTER samples so BEFORE coverage is not silently omitted.

## Data contracts

Every normalized review passed to the core has source-neutral fields for identity, text, language, timestamps, Steam recommendation, rating, playtime, votes, purchase flags, early-access status, and developer response. Steam-specific names remain in adapter metadata only.

Every period emits `PeriodCoverage` with requested bounds, observed bounds, scanned/analyzed counts, start-boundary reachability, page-limit state, and `full|partial|insufficient` status.

The dataset item has the handoff-defined top-level fields: status, game identity, requested/effective comparison modes, comparison rates/delta, impact direction/summary/confidence, patch candidate, new issues, regressions, improvements, feature requests, top themes, coverage, language distribution, warnings, and bounded run stats.

## Analysis and comparison

Steam's `voted_up` is the primary sentiment signal. The Actor does not infer sentiment with an external model. The shared core validates independent period analysis results, while the game taxonomy maps themes such as performance, crashes/stability, bugs, balance, servers/network, progression/grind, monetization, UI/UX, accessibility, localization, Steam Deck, and other documented V1 categories.

The comparison uses rates rather than raw counts. New issues require low BEFORE mention rate, meaningful AFTER mention rate, at least three AFTER mentions, and a negative AFTER share of at least 0.60. Regressions require an at least 0.08 rate increase plus the same negative-share and count safeguards. Insufficient periods never receive a directional impact.

Evidence is limited to two deduplicated snippets per major theme and truncated to 240 characters. It is omitted when `includeEvidence=false`.

Confidence combines sample adequacy, coverage, theme consistency, sentiment magnitude, and patch-date confidence. Partial coverage caps confidence at 0.69; insufficient samples cap it at 0.39.

## Error handling and operations

Input errors fail before collection. A per-game metadata, news, or review failure produces a failed/partial result item and does not stop other App IDs. System-level initialization failures still fail the Actor. News failure is recoverable and uses rolling windows. No credentials, browser, proxy, or user secret are required.

Logs contain progress, page counts, period sample counts, coverage, direction, and confidence only; review text is never logged. Arrays remain bounded by the page cap, sample cap, evidence cap, and maximum of ten games with concurrency no greater than three.

## Testing strategy

Unit tests use sanitized Steam review/news fixtures and cover input validation, exact boundary assignment, retries, malformed responses, cursor loops, page limits, normalization, deterministic sampling, patch scoring, sentiment thresholds, theme deltas, confidence caps, and report shape. Integration tests run the Actor locally against a bounded live smoke input only when explicitly requested; normal tests do not depend on Steam availability.

Each implementation phase ends with its required tests and a `docs/phase-N-report.md` update before the next phase begins. Phase 5 adds schema validation, local default/matrix benchmarks, and cloud validation. Phase 6 adds publish-readiness documentation; push and publication remain explicit final actions after successful cloud verification.
