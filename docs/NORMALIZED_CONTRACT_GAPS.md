# Normalized Contract Gaps

**Date:** 2026-08-01

This document compares the project handoff’s proposed record with the contract currently validated by `packages/feedback-analysis-core` and produced by `actors/google-play-feedback-analyzer/src/core/google-play-contract-adapter.js`.

## Field mapping

| Handoff field | Current neutral contract | Finding | Required resolution |
| --- | --- | --- | --- |
| `recordType: "review"` | Source Actor emits top-level `recordType: "review"`; normalized object has no record type | Compatible at dataset-record level, but the normalized contract itself is not versioned by record type | Define the cross-platform review envelope in Phase 1 and keep source adapter internals behind it |
| `product.productId` | `product.productId` | Compatible for the source app ID, but Google currently uses the platform package ID | Add explicit user `productId` mapping and preserve platform app IDs separately |
| `product.name` | Nullable `product.name` | Current Google adapter leaves it null | Populate from store metadata when available; retain null when unavailable |
| `product.productType: "mobileApp"` | Current value is `"app"` | Stable value mismatch | Choose one canonical value in the comparison contract and adapt both sources to it |
| `platform.id` | Current value is `source.platform: "google-play"` | Shape and enum mismatch; no Apple value exists | Define canonical IDs such as `googlePlay` and `appleAppStore`, with adapter mapping |
| `platform.appId` | App ID is in `product.productId` for Google | Platform identity is not independently represented | Add platform-scoped app ID and store URL fields |
| `platform.storeUrl` | URL is in `source.sourceUrl` | Source URL is present but not platform-scoped | Preserve provenance while exposing the canonical platform URL |
| `review.reviewId` | `source.sourceRecordId` | Same identity concept under a different path | Define one source-neutral identity path and maintain source provenance |
| `review.text` | `feedback.text` | Same content, different path | Adapt both source records to the Phase 1 contract |
| `review.sourceLanguage` | `feedback.sourceLanguage` | Compatible value, including `vi`; source field is required | Preserve original language and validate supported filters separately |
| `review.countryCode` | `environmentContext.countryCode` | Compatible value, but only from request market in Google output; review-level country provenance is not guaranteed | Distinguish collected market from review-attributed country and never infer missing country |
| `review.createdAt` | `feedback.createdAt` | Nullable and Google date parser supports English/Vietnamese store labels | Apple must supply an equivalent normalized timestamp or null |
| `review.updatedAt` | `feedback.updatedAt` | Nullable, currently null for Google | Keep nullable and source-specific |
| `review.appVersion` | `environmentContext.appVersion` and `product.version` exist, but Google currently leaves both null | Required release analysis field is not reliably available | Preserve null, use warnings for missing version metadata, and never infer versions |
| `review.helpfulCount` | `sourceMetadata.helpfulCount` | Compatible value under metadata | Map into the stable neutral record without losing provenance |
| `developerReply` | `sourceMetadata.developerReply` | Compatible payload, but not a stable neutral object | Define reply text/date fields and preserve unknown values as null |
| `environmentContext` | `environmentContext` supports country, version, device, operating system | Shape is compatible but authentication method is absent | Add optional fields only when a source provides them; do not invent values |
| `source.collectedAt` | `source.collectedAt` | Compatible | Require valid non-empty timestamp in both adapters |

## Analysis contract gaps

- The shared analysis result is schema-versioned (`1.0`) and taxonomy-validated, but the deterministic fallback currently marks all non-empty input as non-actionable and produces no topics, issue, or feature-request record. It is suitable as a safe fallback, not as evidence that the handoff’s issue-matching quality targets are met.
- The shared taxonomy already contains common bug, performance, subscription, payment, login, localization, and feature-request types/topics. A mobile extension can be added without changing the common constants, but platform-specific extensions must not leak into cross-platform common fields.
- Analysis output preserves `sourceLanguage`, `analysisLanguage`, and `originalTextPreserved`; Vietnamese contract coverage is present in Google date/normalization tests, but no Apple Vietnamese fixture exists.
- Analysis failures are represented alongside source reviews in the processing path, which supports the handoff’s raw-data-preservation requirement.

## Clustering and release-analysis gaps

- Current clustering already prevents cross-product mixing and requires matching feedback type plus topic/title overlap. It does not carry an explicit platform field, so platform-scoped grouping must be introduced before cross-platform matching.
- Current cluster IDs are product/type/title based. Cross-platform comparison IDs need a separate stable namespace that includes both matched cluster IDs and canonical product identity.
- Current release comparison is a single-source window comparison. It has non-overlapping windows, future-date warnings, limited-data warnings, and observational wording, but no paired Android/iOS release dates or staggered-release model.
- Current aggregate reports expose language/country/version counts but do not include cross-platform statistics, shared/platform-specific classifications, or evidence thresholds.

## Contract decision for the next phase

Phase 1 must define an explicit source-neutral comparison envelope rather than silently changing the existing Google contract. Adapters should make the mapping deliberate, preserve raw/source provenance, retain nulls for unavailable fields, and support product-level identity separate from platform app IDs.
