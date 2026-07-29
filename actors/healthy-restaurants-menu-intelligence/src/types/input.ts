export interface HealthyRestaurantsInput {
  /** One location per run, for example `London, United Kingdom`. */
  location: string;
  keywords?: string[];
  maxRestaurants?: number;
  includeMenu?: boolean;
  normalizedOutputLanguage?: "en";
  preserveOriginalText?: boolean;
  maxMenuPagesPerRestaurant?: number;
  maxMenuItemsPerRestaurant?: number;
}
