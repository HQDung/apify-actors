import { Actor, log } from "apify";
import { chromium } from "playwright";

import { deduplicateVenues, venueIdFor } from "./deduplication.js";
import {
  discoverPlaces,
  extractPlaceDetails,
} from "./discovery/discover-places.js";
import { buildSearchTerms } from "./discovery/search-terms.js";
import { enrichVenue } from "./enrichment/enrich-venue.js";
import { detectLanguage } from "./normalization/index.js";
import { aggregateReviewInsights } from "./reviews/aggregate-review-insights.js";
import { isVenueOutput, validateInput } from "./schemas/validators.js";
import { classifyVenueTypes } from "./taxonomy/venue-types.js";

const unknownAmenities = {
  parentCafe: null,
  birthdayPackages: null,
  parking: null,
  strollerAccessible: null,
  wheelchairAccessible: null,
  wifi: null,
  foodAvailable: null,
  privatePartyRoom: null,
  toilets: null,
  babyChangingFacility: null,
};
const emptyVenueFields = () => ({
  ageSuitability: {
    minimumAge: null,
    maximumAge: null,
    toddlerAreaAvailable: null,
    ageTextOriginal: null,
    confidence: 0,
  },
  activities: [],
  pricing: {
    currency: null,
    pricingUnit: null,
    childPriceFrom: null,
    childPriceTo: null,
    adultPriceFrom: null,
    adultPriceTo: null,
    toddlerPriceFrom: null,
    familyPriceFrom: null,
    priceTextOriginal: null,
    sourceUrl: null,
    confidence: 0,
  },
  amenities: unknownAmenities,
  booking: {
    required: null,
    recommended: null,
    walkInsAccepted: null,
    bookingUrl: null,
    bookingTextOriginal: null,
    confidence: 0,
  },
  rules: {
    gripSocksRequired: null,
    adultSupervisionRequired: null,
    heightRestrictions: [],
    weightRestrictions: [],
    rulesTextOriginal: [],
  },
});

const createContextFactory = async (proxyConfiguration) => async (browser) => {
  const options = proxyConfiguration
    ? { proxy: { server: await proxyConfiguration.newUrl() } }
    : {};
  return browser.newContext(options);
};

const toOutput = ({ place, location, enrichment, input }) => {
  const classificationActivities = enrichment.data?.activities ?? [];
  const extracted = { ...(enrichment.data ?? emptyVenueFields()) };
  const emptyFields = emptyVenueFields();
  if (!input.extractAgeSuitability)
    extracted.ageSuitability = emptyFields.ageSuitability;
  if (!input.extractActivities) extracted.activities = emptyFields.activities;
  if (!input.extractPricing) extracted.pricing = emptyFields.pricing;
  if (!input.extractAmenities) extracted.amenities = emptyFields.amenities;
  if (!input.extractBookingInfo) extracted.booking = emptyFields.booking;
  const reviewInsights = aggregateReviewInsights([]);
  const record = {
    actorOutputSchemaVersion: 1,
    venueId: venueIdFor(place),
    name: place.name ?? null,
    nameOriginal: place.name ?? null,
    source: {
      discoveryPlatform: "google_maps",
      placeId: place.placeId ?? null,
      sourceUrl: place.sourceUrl,
      scrapedAt: new Date().toISOString(),
    },
    location: {
      address: place.address ?? null,
      city: location.query,
      region: null,
      country: null,
      countryCode: location.countryCode ?? null,
      postalCode: null,
      latitude: null,
      longitude: null,
    },
    contact: {
      phone: place.phone ?? null,
      website: place.website ?? null,
      email: null,
      bookingUrl: extracted.booking.bookingUrl,
    },
    business: {
      rating: place.rating ?? null,
      reviewCount: null,
      priceLevel: null,
      openingHours: [],
    },
    venueTypes: classifyVenueTypes({
      name: place.name,
      category: place.category,
      searchTerms: place.searchVenueTypes,
      activities: classificationActivities,
    }),
    ...extracted,
    reviewInsights,
    languages: enrichment.data?.languages ?? {
      detectedSourceLanguages: [
        detectLanguage(`${place.name} ${place.address}`),
      ],
      normalizedOutputLanguage: "en",
    },
    enrichment: {
      officialWebsiteFound: Boolean(place.website),
      websitePagesCrawled: enrichment.pagesCrawled,
      websiteEnrichmentStatus: input.includeWebsiteEnrichment
        ? enrichment.status
        : "not_requested",
      reviewAnalysisStatus: input.includeReviews
        ? "no_source_available"
        : "not_requested",
      warnings: enrichment.warnings,
    },
  };
  if (!input.preserveOriginalText) {
    record.nameOriginal = null;
    record.ageSuitability.ageTextOriginal = null;
    record.pricing.priceTextOriginal = null;
    record.booking.bookingTextOriginal = null;
  }
  return record;
};

await Actor.init();
try {
  const input = validateInput((await Actor.getInput()) ?? {});
  const proxyConfiguration = input.proxyConfiguration?.useApifyProxy
    ? await Actor.createProxyConfiguration(input.proxyConfiguration)
    : null;
  const createContext = await createContextFactory(proxyConfiguration);
  const browser = await chromium.launch({ headless: true });
  let discovered = 0;
  let emitted = 0;
  try {
    for (const location of input.locations) {
      const terms = buildSearchTerms({
        venueTypes: input.venueTypes,
        customSearchTerms: input.customSearchTerms,
        countryCode: location.countryCode,
      });
      const cards = await discoverPlaces({
        browser,
        createContext,
        location,
        terms,
        maxPlaces: input.maxPlacesPerLocation,
      });
      discovered += cards.length;
      const detailed = [];
      for (const card of cards) {
        try {
          detailed.push(
            await extractPlaceDetails({ browser, createContext, place: card }),
          );
        } catch (error) {
          log.warning(
            `Place detail skipped: ${card.sourceUrl} (${error.message})`,
          );
        }
      }
      for (const place of deduplicateVenues(detailed)) {
        const enrichment = input.includeWebsiteEnrichment
          ? await enrichVenue({
              browser,
              createContext,
              website: place.website,
              maximumPages: input.maxWebsitePagesPerPlace,
              preserveOriginalText: input.preserveOriginalText,
            })
          : {
              data: null,
              status: "not_requested",
              pagesCrawled: 0,
              warnings: [],
            };
        const output = toOutput({ place, location, enrichment, input });
        if (!isVenueOutput(output))
          throw new Error(
            `Output validation failed for ${place.name ?? place.sourceUrl}.`,
          );
        await Actor.pushData(output);
        emitted++;
      }
    }
  } finally {
    await browser.close();
  }
  log.info(
    `Finished Kids Activities Intelligence: ${emitted} venues emitted from ${discovered} discovery cards.`,
  );
} finally {
  await Actor.exit();
}
