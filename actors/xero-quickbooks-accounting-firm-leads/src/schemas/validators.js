import { actorConfig } from "../niche-config.js";

const supportedSources = new Set(actorConfig.sourceIds);
const DEFAULT_LOCATION = "London, United Kingdom";

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
  if (raw.locations !== undefined && !Array.isArray(raw.locations)) {
    throw new TypeError("locations must be an array.");
  }
  const locations = [
    ...new Set(
      (raw.locations ?? [DEFAULT_LOCATION]).map((location) =>
        String(location).trim(),
      ),
    ),
  ];
  if (locations.length === 0 || locations.some((location) => !location)) {
    throw new Error("locations must contain at least one non-empty value.");
  }
  if (locations.length > 20) {
    throw new Error("locations must contain no more than 20 values.");
  }

  if (raw.enrichWebsites === true) {
    throw new Error(
      "Website enrichment is not implemented. Remove enrichWebsites or set it to false.",
    );
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
  return {
    locations,
    sources,
    maxResults: requestedMaxResults,
    enrichWebsites: false,
    extractContacts: raw.extractContacts !== false,
    includeRawData: raw.includeRawData === true,
    proxyConfiguration: raw.proxyConfiguration ?? { useApifyProxy: false },
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
