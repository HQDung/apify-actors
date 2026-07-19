import { venueTypes } from "../taxonomy/venue-types.js";

const boundedInteger = (value, fallback, maximum, field) => {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 1 || number > maximum)
    throw new Error(`${field} must be an integer between 1 and ${maximum}.`);
  return number;
};

const inferCountryCode = (query) => {
  if (/(?:^|,\s*)(?:vietnam|việt nam)$/iu.test(query)) return "VN";
  if (
    /(?:^|,\s*)(?:united kingdom|uk|england|scotland|wales|northern ireland)$/iu.test(
      query,
    )
  )
    return "GB";
  return null;
};

export const validateInput = (raw = {}) => {
  if (!Array.isArray(raw.locations) || !raw.locations.length)
    throw new Error("At least one location is required.");
  const locationsByQuery = new Map();
  for (const location of raw.locations) {
    if (typeof location !== "string")
      throw new TypeError("Each location must be a string.");
    const query = location.trim();
    if (!query) throw new Error("Each location requires a query.");
    const key = query.toLocaleLowerCase();
    if (!locationsByQuery.has(key))
      locationsByQuery.set(key, {
        query,
        countryCode: inferCountryCode(query),
      });
  }
  const locations = [...locationsByQuery.values()];
  const selectedVenueTypes = [
    ...new Set((raw.venueTypes ?? ["indoor_playground"]).map(String)),
  ];
  const invalid = selectedVenueTypes.filter(
    (type) => !venueTypes.includes(type),
  );
  if (invalid.length)
    throw new Error(`Unsupported venue type IDs: ${invalid.join(", ")}.`);
  return {
    locations,
    venueTypes: selectedVenueTypes,
    customSearchTerms: [
      ...new Set(
        (raw.customSearchTerms ?? [])
          .map((v) => String(v).trim())
          .filter(Boolean),
      ),
    ],
    maxPlacesPerLocation: boundedInteger(
      raw.maxPlacesPerLocation,
      20,
      50,
      "maxPlacesPerLocation",
    ),
    maxReviewsPerPlace: boundedInteger(
      raw.maxReviewsPerPlace,
      10,
      50,
      "maxReviewsPerPlace",
    ),
    maxWebsitePagesPerPlace: boundedInteger(
      raw.maxWebsitePagesPerPlace,
      5,
      10,
      "maxWebsitePagesPerPlace",
    ),
    includeWebsiteEnrichment: raw.includeWebsiteEnrichment !== false,
    includeReviews: raw.includeReviews === true,
    extractPricing: raw.extractPricing !== false,
    extractAgeSuitability: raw.extractAgeSuitability !== false,
    extractActivities: raw.extractActivities !== false,
    extractAmenities: raw.extractAmenities !== false,
    extractBookingInfo: raw.extractBookingInfo !== false,
    preserveOriginalText: raw.preserveOriginalText !== false,
    proxyConfiguration: raw.proxyConfiguration ?? { useApifyProxy: false },
  };
};

export const isVenueOutput = (record) =>
  record?.actorOutputSchemaVersion === 1 &&
  typeof record.venueId === "string" &&
  Object.values(record).every((value) => value !== undefined);
