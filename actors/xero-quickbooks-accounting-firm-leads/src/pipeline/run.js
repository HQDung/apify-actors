import { firmKeyFor } from "../deduplication/firm-key.js";
import { mergeFirms } from "../deduplication/merge-firms.js";
import { isNormalizedLead } from "../schemas/validators.js";
import { completenessScoreFor } from "../scoring/completeness.js";

const finalizeLead = (lead, scrapedAt, { extractContacts }) => {
  const primaryLocation = lead.locations?.[0] ?? {};
  const sourcePlatforms = new Set(lead.sourcePlatforms ?? []);
  const finalized = {
    ...lead,
    contacts: extractContacts ? lead.contacts : [],
    primaryCity: primaryLocation.city ?? null,
    primaryCountry: primaryLocation.country ?? null,
    primaryCountryCode: primaryLocation.countryCode ?? null,
    primaryEmail: lead.emails?.[0]?.email ?? null,
    primaryPhone: lead.phoneNumbers?.[0] ?? null,
    hasXeroProfile: sourcePlatforms.has("xero"),
    hasQuickBooksProfile: sourcePlatforms.has("quickbooks"),
    scrapedAt,
  };
  finalized.completenessScore = completenessScoreFor(finalized);
  return finalized;
};

export const runPipeline = async ({
  input,
  adapters,
  now = () => new Date(),
  onFailure = () => {},
}) => {
  const summary = {
    effectiveInput: {
      locations: [...input.locations],
      sources: [...input.sources],
      maxResults: input.maxResults,
      enrichWebsites: input.enrichWebsites,
      extractContacts: input.extractContacts,
      includeRawData: input.includeRawData,
    },
    searchJobs: input.locations.length * input.sources.length,
    directoryItemsFound: 0,
    profilesFetched: 0,
    uniqueFirms: 0,
    websitesEnriched: 0,
    resultsPushed: 0,
    duplicateMerges: 0,
    sourceFailures: { xero: 0, quickbooks: 0, website: 0 },
  };
  const normalized = [];

  for (const source of input.sources) {
    const adapter = adapters[source];
    for (const location of input.locations) {
      let items;
      try {
        if (!adapter) throw new Error(`No ${source} adapter is configured.`);
        items = await adapter.search({ location, limit: input.maxResults });
        summary.directoryItemsFound += items.length;
      } catch (error) {
        summary.sourceFailures[source]++;
        onFailure({ source, location, stage: "search", error });
        continue;
      }

      for (const item of items) {
        try {
          const profile = await adapter.fetchProfile(item, { location });
          summary.profilesFetched++;
          const record = await adapter.normalize(profile, {
            locationQuery: location,
            includeRawData: input.includeRawData,
          });
          if (!record?.firmName)
            throw new Error("Normalized profile has no firm name.");
          normalized.push(record);
        } catch (error) {
          summary.sourceFailures[source]++;
          onFailure({ source, location, stage: "profile", item, error });
        }
      }
    }
  }

  const firms = new Map();
  normalized.forEach((record, index) => {
    const key = firmKeyFor(record) ?? `unmerged:${index}`;
    if (firms.has(key)) {
      firms.set(key, mergeFirms(firms.get(key), record));
      summary.duplicateMerges++;
    } else {
      firms.set(key, record);
    }
  });

  const scrapedAt = now().toISOString();
  const leads = [...firms.values()]
    .slice(0, input.maxResults)
    .map((lead) => finalizeLead(lead, scrapedAt, input));
  for (const lead of leads) {
    if (!isNormalizedLead(lead))
      throw new Error(`Invalid normalized lead: ${lead.firmName}.`);
  }
  summary.uniqueFirms = firms.size;
  summary.resultsPushed = leads.length;
  return { leads, summary };
};
