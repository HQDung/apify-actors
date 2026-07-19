import {
  domainOf,
  hash,
  normalizePhone,
  normalizeText,
} from "./normalization/index.js";

export const venueIdFor = (place) =>
  hash(
    place.placeId
      ? `place:${place.placeId}`
      : `${normalizeText(place.name)}|${normalizeText(place.address)}`,
  );
export const deduplicateVenues = (places) => {
  const output = [];
  const seen = new Map();
  for (const place of places) {
    let key = `address:${normalizeText(place.name)}|${normalizeText(place.address)}`;
    if (place.phone) key = `phone:${normalizePhone(place.phone)}`;
    if (place.website)
      key = `site:${domainOf(place.website)}|${normalizeText(place.name)}`;
    if (place.placeId) key = `place:${place.placeId}`;
    const existing = seen.get(key);
    if (existing) {
      existing.searchVenueTypes = [
        ...new Set([...existing.searchVenueTypes, ...place.searchVenueTypes]),
      ];
      continue;
    }
    seen.set(key, place);
    output.push(place);
  }
  return output;
};
