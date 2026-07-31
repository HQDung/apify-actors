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
  websiteEnricher = null,
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
    websiteAttempts: 0,
    websiteSuccesses: 0,
    websiteFailures: 0,
    websitePagesFetched: 0,
    websiteContactsFound: 0,
    websiteEmailsFound: 0,
    websitePhonesFound: 0,
    websiteServicesFound: 0,
    websiteIndustriesFound: 0,
    websiteDomainTimeouts: 0,
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

  let finalRecords = [...firms.values()].slice(0, input.maxResults);
  if (input.enrichWebsites) {
    try {
      const activeEnricher = websiteEnricher;
      if (!activeEnricher)
        throw new Error(
          "Website enrichment is enabled but no enricher is configured.",
        );
      finalRecords = await activeEnricher.enrich(finalRecords);
      const metrics = activeEnricher.getMetrics?.() ?? {};
      summary.websiteAttempts = Number(metrics.attempts) || 0;
      summary.websiteSuccesses = Number(metrics.successes) || 0;
      summary.websiteFailures = Number(metrics.failures) || 0;
      summary.websitesEnriched = summary.websiteSuccesses;
      summary.websitePagesFetched = Number(metrics.pagesFetched) || 0;
      summary.websiteContactsFound = Number(metrics.contactsFound) || 0;
      summary.websiteEmailsFound = Number(metrics.emailsFound) || 0;
      summary.websitePhonesFound = Number(metrics.phonesFound) || 0;
      summary.websiteServicesFound = Number(metrics.servicesFound) || 0;
      summary.websiteIndustriesFound = Number(metrics.industriesFound) || 0;
      summary.websiteDomainTimeouts = Number(metrics.domainTimeouts) || 0;
      summary.sourceFailures.website = summary.websiteFailures;
      summary.retryAttempts.website = Number(metrics.retryAttempts) || 0;
    } catch (error) {
      summary.websiteFailures = 1;
      summary.sourceFailures.website = 1;
      onFailure({
        source: "website",
        location: null,
        stage: "enrichment",
        error,
      });
    }
  }
  const scrapedAt = now().toISOString();
  const leads = finalRecords.map((lead) =>
    finalizeLead(lead, scrapedAt, input),
  );
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
