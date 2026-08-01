export const createInitialRunStats = ({ productCount }) => ({
  productsRequested: productCount,
  productsProcessed: 0,
  googlePlayReviewsCollected: 0,
  appleAppStoreReviewsCollected: 0,
  reviewsAnalyzed: 0,
  platformClustersCreated: 0,
  crossPlatformComparisonsCreated: 0,
  errors: 0,
});
