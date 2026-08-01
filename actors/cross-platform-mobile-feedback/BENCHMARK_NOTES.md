# Benchmark notes

## Phase 12 — README and Store preparation

Store-facing title, description, README, examples, output links, cost controls, benchmark evidence, limitations, FAQ, and responsible-use language are synchronized. The listing uses conservative selected-dataset coverage claims and does not claim worldwide availability. No pricing or publication action is performed automatically.

## Phase 11 — Quality benchmark

`npm run benchmark:quality` runs a deterministic 100-review fixture: 50 Android reviews, 50 iOS reviews, 25 known shared review pairs, 10 feature-request pairs, 50 labeled platform-specific examples, mixed English/Vietnamese country and language metadata, and staggered Android/iOS release dates. Current result: analysis-schema validity 100%, cluster coherence 100%, shared precision 100%, shared recall 100%, platform-specific false-positive rate 0%, rating/country/language/version accuracy 100%, release-window accuracy 100%, no cross-product matches, and an estimated fixture-provider cost of $0.02 per product comparison. This is a quality fixture, not a claim of live store coverage; the local sandbox source smoke recorded fetch failures as structured errors.

## Phase 10 — Schemas, errors, and runtime safeguards

The local benchmark covers input expansion caps, runtime statistics validation, source diagnostic/run-error validation, dataset/output schema artifacts, predictable report keys, source-error key-value output, and vendored runtime package packaging. No publish or pricing action is performed.

## Phase 9 — Version and release-window comparisons

The local benchmark covers non-overlapping platform-specific before/after windows, staggered release dates, topic changes, newly observed issues, possible regressions, missing app-version warnings, minimum release-window samples, rollout lag, and observational disclaimers.

## Phase 8 — Country and language comparisons

The local benchmark covers country/language/version dimension records, platform-separated counts and ratings, negative-topic/actionability signals, configurable minimum dimension samples, limited-evidence labeling, and explicit requested-locale attribution. Country and language are kept as separate dimensions.

## Phase 7 — Per-product reports and aggregate summaries

The local benchmark covers validated per-product report generation, platform review/actionability/rating statistics, shared and platform-specific comparison placement, rating/volume differences, country/language/version dimensions, key-value report storage, and missing-source warnings.

## Phase 6 — Cross-platform cluster matching

The local benchmark covers same-product matching, feedback-type compatibility, topic/title overlap, shared confidence, feature-request/bug separation, unrelated-issue rejection, platform-specific findings, platform dominance, and insufficient-evidence handling when a source is missing. Matching uses explainable signals and never claims absence from an unobserved platform.

## Phase 5 — Platform-level issue clustering

The local benchmark covers platform-partitioned clustering, product isolation, minimum cluster size, successful-analysis filtering, canonical cluster IDs, and source review links with country/language/version dimensions. Cross-platform matching is intentionally deferred to its own phase.

## Phase 4 — Shared per-review analysis

The local benchmark covers the source-neutral adapter, one common taxonomy for Android/iOS, English and Vietnamese source-language preservation, provider success, invalid-provider fallback, bounded in-memory caching, optional native-fetch provider configuration, and raw-review retention when analysis fails. No API key or billable provider call is required for the fallback tests.

## Phase 3 — Raw cross-platform source collection

The local benchmark covers injected Google Play and Apple App Store responses, normalized review records, source diagnostics, bounded request controls, deduplication, and preservation of successful records when the other platform returns a scoped error. A sandboxed local run may report source fetch failures because public network access is environment-dependent; those failures are emitted as dataset diagnostics rather than hidden.

## Phase 2 — Actor skeleton and product mapping

The local benchmark covers both-platform and one-platform mappings, explicit-ID precedence over URLs, duplicate platform-ID rejection, invalid source IDs, all supported modes, release metadata validation, and zero-collection run statistics.

Analysis, comparison accuracy, runtime, and cost are deferred to their designated phases. No pricing or publication action is performed automatically.
