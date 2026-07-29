export type DietaryTagId =
  | "vegan"
  | "vegetarian"
  | "gluten_free"
  | "dairy_free"
  | "nut_free"
  | "halal"
  | "kosher"
  | "organic"
  | "high_protein"
  | "low_carb"
  | "keto"
  | "low_calorie"
  | "plant_based"
  | "sugar_free"
  | "no_added_sugar";

export type DietaryTagSourceType =
  | "restaurant_claim"
  | "menu_label"
  | "menu_description"
  | "website_metadata"
  | "inferred";

export interface DietaryTag {
  id: DietaryTagId;
  labelOriginal: string | null;
  sourceType: DietaryTagSourceType;
  sourceUrl: string | null;
  confidence: number;
}

export interface PublishedNutrition {
  calories: number | null;
  proteinGrams: number | null;
  carbohydrateGrams: number | null;
  fatGrams: number | null;
  sodiumMilligrams: number | null;
  servingSizeOriginal: string | null;
  sourceType: "restaurant_published";
}

export interface MenuPrice {
  amount: number | null;
  currency: string | null;
  formattedOriginal: string | null;
  priceType?: "fixed" | "from" | "range" | "multiple" | "unknown";
}

export interface MenuItem {
  nameOriginal: string;
  nameNormalized: string;
  descriptionOriginal: string | null;
  descriptionNormalized: string | null;
  sectionOriginal: string | null;
  sectionNormalized: string | null;
  price: MenuPrice | null;
  publishedNutrition: PublishedNutrition | null;
  dietaryTags: DietaryTag[];
  sourceUrl: string;
}

export type MenuStatus =
  | "not_requested"
  | "website_missing"
  | "website_unreachable"
  | "menu_not_found"
  | "menu_found"
  | "unsupported_format"
  | "extraction_failed"
  | "extracted"
  | "extracted_empty";

export type MenuCandidateFormat =
  "html" | "pdf" | "image" | "third_party_ordering" | "unknown";

export interface MenuCandidate {
  url: string;
  sourceUrl: string;
  format: MenuCandidateFormat;
  score: number;
  sameDomain: boolean;
  sources: string[];
}

export interface MenuOutput {
  status: MenuStatus;
  sourceUrl: string | null;
  menuUrls: string[];
  menuCandidates: MenuCandidate[];
  itemsFound: number;
  items: MenuItem[];
}

export interface HealthyPositioningSignal {
  type: string;
  value: string;
  sourceUrl: string | null;
}

export interface HealthyPositioning {
  isHealthyFocused: boolean;
  confidence: number;
  signals: HealthyPositioningSignal[];
}

export interface RestaurantLocation {
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface RestaurantContact {
  website: string | null;
  phone: string | null;
}

export interface SourceBusiness {
  platform: string;
  sourceUrl: string;
  canonicalUrl?: string;
  placeId?: string | null;
  normalizedDomain?: string | null;
  scrapedAt: string;
}

export interface OutputMessage {
  code: string;
  message: string;
  sourceUrl?: string | null;
}

export interface HealthyRestaurantOutput {
  actorOutputSchemaVersion: 1;
  restaurantId?: string;
  restaurantName: string;
  restaurantNameNormalized: string;
  matchedKeywords: string[];
  location: RestaurantLocation;
  contact: RestaurantContact;
  sourceBusiness: SourceBusiness;
  rating: number | null;
  reviewCount: number | null;
  priceLevel: string | null;
  healthyPositioning: HealthyPositioning;
  dietaryOptions: DietaryTag[];
  menu: MenuOutput;
  language: {
    detected: string | null;
    normalizedOutput: "en";
  };
  warnings: OutputMessage[];
  errors: OutputMessage[];
  scrapedAt: string;
}
