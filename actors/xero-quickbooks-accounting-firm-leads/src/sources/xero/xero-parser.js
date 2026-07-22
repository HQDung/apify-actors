import { canonicalizeUrl, domainFromUrl } from "../../normalization/url.js";
import { mapIndustries, mapServices } from "../../taxonomy/taxonomies.js";

const unique = (values) => [...new Set(values.filter(Boolean))];

export const parseXeroSearchHtml = (html, limit) => {
  const match = String(html).match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/iu,
  );
  if (!match) {
    throw new Error("Xero search response has no embedded directory data.");
  }

  const data = JSON.parse(match[1]);
  const cards = (data.props?.pageProps?.main ?? []).find(
    (component) =>
      component?.["@type"] === "xero/components/content/detail-cards" &&
      component?.heading === "Featured advisors",
  );

  return (cards?.items ?? [])
    .map((item) => ({
      id: item.links?.[0]?.href?.match(/-([a-f0-9]{12})\/?$/iu)?.[1] ?? null,
      firmName: item.heading?.trim() ?? null,
      description: item.description?.trim() ?? null,
      profileUrl: canonicalizeUrl(item.links?.[0]?.href),
      source: "xero",
    }))
    .filter((item) => item.firmName && item.profileUrl)
    .slice(0, limit);
};

export const normalizeXeroProfile = (
  profile,
  { locationQuery, includeRawData },
) => {
  const description = profile.description ?? "";
  const inferredLabels = /\bbusiness consult/iu.test(description)
    ? ["Business advisory"]
    : [];
  const services = mapServices([
    ...(profile.achievements ?? []),
    ...inferredLabels,
    description,
  ]);
  const website = canonicalizeUrl(profile.website);
  const addressParts = String(profile.address ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const region = /\bEngland\b/iu.test(addressParts.at(-1) ?? "")
    ? "England"
    : null;
  let city = null;
  if (region) city = addressParts.at(-2) ?? null;
  else if (/\bLondon\b/iu.test(profile.address ?? "")) city = "London";

  return {
    firmName: profile.firmName,
    advisorNames: unique(profile.team ?? []),
    firmTypes: ["accounting_firm"],
    locations: [
      {
        address: profile.address ?? null,
        city,
        region,
        postalCode: null,
        country: "United Kingdom",
        countryCode: "GB",
      },
    ],
    website,
    domain: domainFromUrl(website),
    phoneNumbers: unique(profile.phoneNumbers ?? []),
    emails: [],
    services,
    industriesServed: mapIndustries(profile.industries),
    softwarePlatforms: [
      {
        platform: "xero",
        relationship: "partner",
        certifications: unique(profile.achievements ?? []),
        specialties: services,
        profileUrl: profile.profileUrl,
        source: "xero",
      },
    ],
    contacts: unique(profile.team ?? []).map((name) => ({
      name,
      role: null,
      email: null,
      phone: null,
      profileUrl: profile.profileUrl,
      source: "xero",
    })),
    socialLinks: {
      linkedin: profile.socialLinks?.linkedin ?? null,
      facebook: profile.socialLinks?.facebook ?? null,
      instagram: null,
      x: null,
    },
    languages: [],
    descriptionOriginal: profile.description ?? null,
    descriptionNormalized: null,
    sourcePlatforms: ["xero"],
    sourceRecords: [
      {
        source: "xero",
        profileUrl: profile.profileUrl,
        locationQuery,
      },
    ],
    rawData: includeRawData
      ? {
          xero: {
            id: profile.id,
            experience: profile.experience ?? [],
            achievements: profile.achievements ?? [],
          },
        }
      : null,
  };
};
