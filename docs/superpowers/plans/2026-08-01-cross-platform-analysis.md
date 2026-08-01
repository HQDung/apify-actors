# Phase 4 plan: shared per-review analysis

## Objective

Run collected Google Play and Apple App Store reviews through the same source-neutral normalized feedback contract and shared analysis core, with bilingual compatibility, optional provider usage, deterministic fallback, caching, and explicit cost limits.

## Implementation

1. Adapt the cross-platform review envelope into the existing normalized-feedback contract while preserving canonical product identity and platform environment fields.
2. Define one common mobile taxonomy for feedback types and topic IDs used by both platforms.
3. Add per-review analysis orchestration with shared provider/fallback behavior and bounded in-memory caching.
4. Add an optional native-fetch OpenAI-compatible provider activated only by `OPENAI_API_KEY`; keep fallback operation dependency-free.
5. Add analysis attempt, review-cap, cache-cap, and usage statistics without removing raw records.
6. Update Actor schemas, samples, README, benchmark notes, and changelog together.

## Acceptance criteria

- Equivalent Android and iOS fixture feedback uses compatible feedback type and topic IDs.
- English and Vietnamese source-language tests pass without changing source language attribution.
- Invalid provider output falls back to a validated result while raw review records remain available.
- Provider calls and analysis volume are bounded; cache entries are bounded.
- The Actor completes with no provider key and reports deterministic fallback usage.
