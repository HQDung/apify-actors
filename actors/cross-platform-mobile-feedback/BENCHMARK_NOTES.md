# Benchmark notes

## Phase 3 — Raw cross-platform source collection

The local benchmark covers injected Google Play and Apple App Store responses, normalized review records, source diagnostics, bounded request controls, deduplication, and preservation of successful records when the other platform returns a scoped error. A sandboxed local run may report source fetch failures because public network access is environment-dependent; those failures are emitted as dataset diagnostics rather than hidden.

## Phase 2 — Actor skeleton and product mapping

The local benchmark covers both-platform and one-platform mappings, explicit-ID precedence over URLs, duplicate platform-ID rejection, invalid source IDs, all supported modes, release metadata validation, and zero-collection run statistics.

Analysis, comparison accuracy, runtime, and cost are deferred to their designated phases. No pricing or publication action is performed automatically.
