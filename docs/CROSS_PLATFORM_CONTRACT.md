# Cross-Platform Comparison Contract

**Date:** 2026-08-01  
**Contract version:** 1.0

The source-neutral comparison contracts live in packages/cross-platform-comparison-core. The package has no Apify runtime dependency and can be used by the comparison Actor, tests, and future source adapters.

## Canonical identities

productId is the user-supplied cross-platform identity. It is not inferred from app names or store IDs. A product mapping may contain one or both of these canonical platform IDs:

- googlePlay: Android package ID plus optional store URL.
- appleAppStore: numeric Apple app ID plus optional store URL.

The comparison contract uses android and ios for user-facing classification fields and warning labels. The source IDs remain googlePlay and appleAppStore in product mappings and normalized source records.

~~~json
{
  "productId": "example-product",
  "name": "Example App",
  "productType": "mobileApp",
  "platforms": {
    "googlePlay": {
      "appId": "com.example.app",
      "storeUrl": "https://play.google.com/store/apps/details?id=com.example.app"
    },
    "appleAppStore": {
      "appId": "123456789",
      "storeUrl": "https://apps.apple.com/us/app/example/id123456789"
    }
  }
}
~~~

At least one platform is valid for raw/source collection. Comparison reports require both platform mappings. Product-level duplicate-ID checks are an orchestration responsibility in Phase 2; this package validates one mapping at a time.

## Comparison classifications

The allowed classifications are:

shared, androidOnly, iosOnly, platformDominantAndroid, platformDominantIos, and insufficientEvidence.

shared requires both platform cluster IDs, both positive mention counts, a bounded sharedConfidence, and non-empty human-readable reasons. Platform-specific and platform-dominant findings require observedOnlyInCollectedSample: true, an evidence status, and a bounded comparison confidence. This prevents “not found on the other platform” from becoming an unsupported absence claim.

Every crossPlatformComparison record includes:

- recordType, comparisonId, product, classification;
- canonicalIssue, feedbackType, topics, severity;
- androidClusterId/iosClusterId when available;
- androidMentions/iosMentions for shared findings or mentionCount/platform for specific findings;
- sharedConfidence or comparisonConfidence;
- reasons and structured warnings.

comparisonId is deterministic from product ID, classification, and canonical issue text after lower-case safe normalization.

## Report contract

crossPlatformFeedbackReport contains the explicit product mapping, review window, platform statistics, shared issues, Android-only issues, iOS-only issues, shared feature requests, platform differences, country/language/version insights, warnings, and generatedAt.

Required statistics use source IDs to avoid ambiguity:

~~~text
googlePlayReviewsCollected
appleAppStoreReviewsCollected
googlePlayAverageRating
appleAppStoreAverageRating
googlePlayActionableReviews
appleAppStoreActionableReviews
~~~

An average may be null when no rating exists. A zero-review platform must have an INSUFFICIENT_CROSS_PLATFORM_DATA warning scoped to googlePlay/android or appleAppStore/ios. The report therefore distinguishes missing evidence from evidence of absence.

## Source compatibility

The current Google and Apple Actors both produce the shared core’s validated shape: source, product, feedback, environmentContext, and sourceMetadata. Phase 2 will map their platform app IDs into an explicit user product mapping without mutating source records. Missing country, language, version, device, reply, or date values remain nullable/unknown.

Analysis, clusters, and release windows remain platform-scoped until later phases. This contract package defines their comparison-facing fields but does not perform semantic matching or aggregation.
