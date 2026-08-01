import {
  cleanText,
  domainOf,
  hash,
  normalizeGoogleMapsUrl,
  normalizePhone,
  normalizeText,
  normalizeUrl,
  parseLocation,
  parsePostalCode,
} from "../normalization/index.js";

export const buildSearchJobs = ({ location, keywords }) =>
  keywords.map((keyword) => ({
    keyword,
    location,
    query: `${keyword} in ${location}`,
  }));

const placeCardsMatch = (left, right) => {
  if (left.placeId && right.placeId && left.placeId === right.placeId)
    return true;
  const leftUrl = normalizeGoogleMapsUrl(left.sourceUrl);
  const rightUrl = normalizeGoogleMapsUrl(right.sourceUrl);
  return Boolean(leftUrl && rightUrl && leftUrl === rightUrl);
};

export const deduplicatePlaceCards = (cards, maxCards = Infinity) => {
  const output = [];
  for (const card of cards) {
    const matchingIndex = output.findIndex((existing) =>
      placeCardsMatch(existing, card),
    );
    if (matchingIndex === -1) {
      output.push({
        ...card,
        matchedKeywords: [...new Set(card.matchedKeywords ?? [])],
      });
      continue;
    }
    const existing = output[matchingIndex];
    output[matchingIndex] = {
      ...existing,
      name: existing.name ?? card.name,
      sourceUrl: existing.sourceUrl ?? card.sourceUrl,
      canonicalUrl: existing.canonicalUrl ?? card.canonicalUrl,
      placeId: existing.placeId ?? card.placeId,
      matchedKeywords: [
        ...new Set([
          ...(existing.matchedKeywords ?? []),
          ...(card.matchedKeywords ?? []),
        ]),
      ],
    };
  }
  return output.slice(0, maxCards);
};

const addressOf = (candidate) => cleanText(candidate.address);
const domainOfCandidate = (candidate) => domainOf(candidate.website);

export const normalizeRestaurantCandidate = (candidate, location, now) => {
  const restaurantName = cleanText(candidate.name) ?? "Unknown restaurant";
  const address = addressOf(candidate);
  const canonicalUrl =
    normalizeGoogleMapsUrl(candidate.canonicalUrl ?? candidate.sourceUrl) ??
    candidate.sourceUrl;
  const website = normalizeUrl(candidate.website);
  const placeId = candidate.placeId ?? null;
  const matchedKeywords = [
    ...new Set(
      (candidate.matchedKeywords ?? [])
        .filter((keyword) => typeof keyword === "string")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  ];
  const locationParts = parseLocation(location);
  const scrapedAt = now ?? new Date().toISOString();

  return {
    actorOutputSchemaVersion: 1,
    restaurantName,
    restaurantNameNormalized: normalizeText(restaurantName),
    matchedKeywords,
    location: {
      address,
      city: locationParts.city,
      region: locationParts.region,
      country: locationParts.country,
      countryCode: locationParts.countryCode,
      postalCode: parsePostalCode(address),
      latitude: candidate.latitude ?? null,
      longitude: candidate.longitude ?? null,
    },
    contact: {
      website,
      phone: normalizePhone(candidate.phone),
    },
    sourceBusiness: {
      platform: "google_maps",
      sourceUrl: canonicalUrl,
      canonicalUrl,
      placeId,
      normalizedDomain: domainOfCandidate(candidate),
      scrapedAt,
    },
    rating: Number.isFinite(candidate.rating) ? candidate.rating : null,
    reviewCount: null,
    priceLevel: null,
    healthyPositioning: {
      isHealthyFocused: false,
      confidence: 0,
      signals: [],
    },
    dietaryOptions: [],
    menu: {
      status: "not_requested",
      sourceUrl: null,
      menuUrls: [],
      menuCandidates: [],
      extractionMethods: [],
      itemsFound: 0,
      items: [],
    },
    language: {
      detected: null,
      normalizedOutput: "en",
    },
    warnings: [],
    errors: [],
    scrapedAt,
  };
};

const hasConflictingAddresses = (left, right) => {
  const leftAddress = normalizeText(left.location?.address);
  const rightAddress = normalizeText(right.location?.address);
  const leftPostcode = normalizeText(left.location?.postalCode);
  const rightPostcode = normalizeText(right.location?.postalCode);
  return (
    (leftAddress && rightAddress && leftAddress !== rightAddress) ||
    (leftPostcode && rightPostcode && leftPostcode !== rightPostcode)
  );
};

const sameNonEmpty = (left, right) => Boolean(left && right && left === right);

const shouldMerge = (left, right) => {
  if (hasConflictingAddresses(left, right)) return false;
  const leftSource = left.sourceBusiness;
  const rightSource = right.sourceBusiness;
  if (sameNonEmpty(leftSource.placeId, rightSource.placeId)) return true;
  if (
    sameNonEmpty(leftSource.canonicalUrl, rightSource.canonicalUrl) ||
    sameNonEmpty(leftSource.sourceUrl, rightSource.sourceUrl)
  )
    return true;
  if (sameNonEmpty(left.contact.phone, right.contact.phone)) return true;
  if (sameNonEmpty(leftSource.normalizedDomain, rightSource.normalizedDomain))
    return true;
  if (
    sameNonEmpty(
      left.restaurantNameNormalized,
      right.restaurantNameNormalized,
    ) &&
    (sameNonEmpty(left.location.postalCode, right.location.postalCode) ||
      sameNonEmpty(left.location.address, right.location.address))
  )
    return true;
  return false;
};

const mergeRecords = (left, right) => ({
  ...left,
  restaurantName: left.restaurantName || right.restaurantName,
  contact: {
    ...left.contact,
    website: left.contact.website ?? right.contact.website,
    phone: left.contact.phone ?? right.contact.phone,
  },
  location: {
    ...left.location,
    address: left.location.address ?? right.location.address,
    postalCode: left.location.postalCode ?? right.location.postalCode,
    latitude: left.location.latitude ?? right.location.latitude,
    longitude: left.location.longitude ?? right.location.longitude,
  },
  sourceBusiness: {
    ...left.sourceBusiness,
    canonicalUrl:
      left.sourceBusiness.canonicalUrl ?? right.sourceBusiness.canonicalUrl,
    placeId: left.sourceBusiness.placeId ?? right.sourceBusiness.placeId,
    normalizedDomain:
      left.sourceBusiness.normalizedDomain ??
      right.sourceBusiness.normalizedDomain,
  },
  matchedKeywords: [
    ...new Set([...left.matchedKeywords, ...right.matchedKeywords]),
  ],
});

export const deduplicateRestaurants = (records, maxRestaurants = Infinity) => {
  const output = [];
  for (const record of records) {
    const matchingIndexes = output
      .map((existing, index) => (shouldMerge(existing, record) ? index : -1))
      .filter((index) => index >= 0);
    if (!matchingIndexes.length) {
      output.push(record);
      continue;
    }
    const targetIndex = matchingIndexes[0];
    let merged = mergeRecords(output[targetIndex], record);
    for (const index of matchingIndexes.slice(1).reverse()) {
      merged = mergeRecords(merged, output[index]);
      output.splice(index, 1);
    }
    output[targetIndex] = merged;
  }
  return output.slice(0, maxRestaurants);
};

export const restaurantIdFor = (record) =>
  hash(
    record.sourceBusiness.placeId
      ? `place:${record.sourceBusiness.placeId}`
      : `${record.restaurantNameNormalized}|${normalizeText(record.location.address)}`,
  );
