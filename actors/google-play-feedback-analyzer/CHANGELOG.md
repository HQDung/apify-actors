# Changelog

## 0.1.0

- Added bounded public Google Play Store HTML collection.
- Added locale-aware review parsing, optional developer replies, and source diagnostics.
- Added validated source-neutral `normalizedFeedback` objects backed by shared core v1.
- Added optional shared-core deterministic analysis with Google Play taxonomy settings.
- Added shared-core per-app clustering, aggregate reports, and observational release-window comparisons.
- Added per-app aggregate report key-value records and dataset schema fields for cluster/report outputs.
- Added `releaseImpact` mode with bounded before/after windows, multi-language/country collection, rating and issue deltas, and structured data-sufficiency warnings.
- Added per-app `APP_RELEASE_IMPACT_<app-id>` key-value reports.
- Added a five-app operational benchmark, quality-review limitations, and cost accounting notes.
- Added Store-ready dataset views for reviews, issue clusters, app reports, and release-impact reports, plus clearer output links and debug input documentation.
- Updated Store-facing title, README positioning, FAQ, cost controls, SEO terms, and responsible-use limitations.
- Completed the final local publish-readiness matrix; publishing remains gated by explicit authorization and missing human-labeled accuracy/cloud-cost evidence.
- Completed authorized cloud build and standard/release-impact smoke tests; published the Actor publicly under the AI and Business categories without changing pricing.
- Added a bounded `appIds` schema default and default-input regression coverage so Store automation can start the standard review mode without manual package IDs.
- Browser expansion and external-provider analysis remain deferred.
