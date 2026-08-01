# Benchmark notes

## Phase 4 — Shared per-review analysis

The local benchmark covers the source-neutral adapter, one common taxonomy for Android/iOS, English and Vietnamese source-language preservation, provider success, invalid-provider fallback, bounded in-memory caching, optional native-fetch provider configuration, and raw-review retention when analysis fails. No API key or billable provider call is required for the fallback tests.

## Phase 3 — Raw cross-platform source collection

The local benchmark covers injected Google Play and Apple App Store responses, normalized review records, source diagnostics, bounded request controls, deduplication, and preservation of successful records when the other platform returns a scoped error. A sandboxed local run may report source fetch failures because public network access is environment-dependent; those failures are emitted as dataset diagnostics rather than hidden.

## Phase 2 — Actor skeleton and product mapping

The local benchmark covers both-platform and one-platform mappings, explicit-ID precedence over URLs, duplicate platform-ID rejection, invalid source IDs, all supported modes, release metadata validation, and zero-collection run statistics.

Analysis, comparison accuracy, runtime, and cost are deferred to their designated phases. No pricing or publication action is performed automatically.
