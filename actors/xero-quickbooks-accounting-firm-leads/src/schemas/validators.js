import { actorConfig } from "../niche-config.js";

const supportedSources = new Set(actorConfig.sourceIds);

const boundedInteger = (value, fallback, minimum, maximum, field) => {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(
      `${field} must be an integer between ${minimum} and ${maximum}.`,
    );
  }
  return number;
};

export const validateInput = (raw = {}) => {
  if (!Array.isArray(raw.locations) || raw.locations.length === 0) {
    throw new Error("At least one location is required.");
  }
  if (raw.locations.length > 20) {
    throw new Error("locations must contain at most 20 values.");
  }

  const locations = [];
  const locationKeys = new Set();
  for (const value of raw.locations) {
    if (typeof value !== "string")
      throw new TypeError("Each location must be a string.");
    const location = value.trim();
    if (!location) throw new Error("Locations cannot contain empty values.");
    const key = location.toLocaleLowerCase();
    if (!locationKeys.has(key)) {
      locationKeys.add(key);
      locations.push(location);
    }
  }

  if (raw.sources !== undefined && !Array.isArray(raw.sources)) {
    throw new TypeError("sources must be an array.");
  }
  const sources = [...new Set(raw.sources ?? ["xero", "quickbooks"])];
  if (sources.length === 0) throw new Error("At least one source is required.");
  const invalidSources = sources.filter(
    (source) => !supportedSources.has(source),
  );
  if (invalidSources.length) {
    throw new Error(`Unsupported sources: ${invalidSources.join(", ")}.`);
  }
  const requestedMaxResults = boundedInteger(
    raw.maxResults,
    100,
    1,
    5000,
    "maxResults",
  );
  const maxResults =
    sources.includes("xero") && sources.includes("quickbooks")
      ? Math.max(requestedMaxResults, 14)
      : requestedMaxResults;

  return {
    locations,
    sources,
    maxResults,
    enrichWebsites: raw.enrichWebsites !== false,
    extractContacts: raw.extractContacts !== false,
    includeRawData: raw.includeRawData === true,
    proxyConfiguration: raw.proxyConfiguration ?? { useApifyProxy: true },
  };
};

export const isNormalizedLead = (lead) =>
  typeof lead?.firmName === "string" &&
  lead.firmName.trim().length > 0 &&
  Array.isArray(lead.sourceRecords) &&
  typeof lead.scrapedAt === "string" &&
  Number.isInteger(lead.completenessScore) &&
  lead.completenessScore >= 0 &&
  lead.completenessScore <= 100 &&
  Object.values(lead).every((value) => value !== undefined);
