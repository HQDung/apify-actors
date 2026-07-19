export interface KidsActivitiesInput {
  locations: string[];
  venueTypes?: string[];
  customSearchTerms?: string[];
  maxPlacesPerLocation?: number;
  includeWebsiteEnrichment?: boolean;
  includeReviews?: boolean;
  maxReviewsPerPlace?: number;
  maxWebsitePagesPerPlace?: number;
  preserveOriginalText?: boolean;
  proxyConfiguration?: { useApifyProxy?: boolean };
}

export interface NormalizedLocation {
  query: string;
  countryCode: string | null;
}
