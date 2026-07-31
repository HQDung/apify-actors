import { firmKeyFor } from "../deduplication/firm-key.js";
import { mergeFirms } from "../deduplication/merge-firms.js";
import { isNormalizedLead } from "../schemas/validators.js";
import { completenessScoreFor } from "../scoring/completeness.js";

const mergeReasonFor = (key) => {
  if (key.startsWith("domain:")) return "domain";
  if (key.startsWith("phone:")) return "phone";
  if (key.startsWith("name-location:")) return "name-location";
  if (key.startsWith("advisor:")) return "advisor";
  return "unknown";
};

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
    mergeReasons: {
      domain: 0,
      phone: 0,
      "name-location": 0,
      advisor: 0,
      unknown: 0,
    },
    retryAttempts: { xero: 0, quickbooks: 0 },
    paginationPages: { xero: 0, quickbooks: 0 },
    partialProfiles: { xero: 0, quickbooks: 0 },
    sourceFailures: { xero: 0, quickbooks: 0, website: 0 },
  };
  const normalized = [];
  const jobQueues = [];

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
      jobQueues.push({ source, location, adapter, items: [...items] });
    }
  }

  let queueHasItems = true;
  while (queueHasItems) {
    queueHasItems = false;
    for (const job of jobQueues) {
      const item = job.items.shift();
      if (!item) continue;
      queueHasItems = true;
      try {
        const profile = await job.adapter.fetchProfile(item, {
          location: job.location,
        });
        summary.profilesFetched++;
        if (profile?.partialProfile) summary.partialProfiles[job.source]++;
        const record = await job.adapter.normalize(profile, {
          locationQuery: job.location,
          includeRawData: input.includeRawData,
        });
        if (!record?.firmName)
          throw new Error("Normalized profile has no firm name.");
        normalized.push(record);
      } catch (error) {
        summary.sourceFailures[job.source]++;
        onFailure({
          source: job.source,
          location: job.location,
          stage: "profile",
          item,
          error,
        });
      }
    }
  }

  const firms = new Map();
  normalized.forEach((record, index) => {
    const key = firmKeyFor(record) ?? `unmerged:${index}`;
    if (firms.has(key)) {
      firms.set(key, mergeFirms(firms.get(key), record));
      summary.duplicateMerges++;
      summary.mergeReasons[mergeReasonFor(key)]++;
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
  for (const source of input.sources) {
    const metrics = adapters[source]?.getMetrics?.() ?? {};
    summary.retryAttempts[source] = Number(metrics.retryAttempts) || 0;
    summary.paginationPages[source] = Number(metrics.paginationPages) || 0;
    summary.partialProfiles[source] = Number(metrics.partialProfiles) || 0;
  }
  return { leads, summary };
};
