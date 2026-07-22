import { resolveLocation } from "../../location/locale-resolver.js";
import { classifyEmail, normalizeEmail } from "../../normalization/contact.js";
import { canonicalizeUrl, domainFromUrl } from "../../normalization/url.js";
import { mapIndustries, mapServices } from "../../taxonomy/taxonomies.js";

const languageCodes = new Map([
  ["english", "en"],
  ["punjabi", "pa"],
  ["hindi", "hi"],
  ["vietnamese", "vi"],
  ["spanish", "es"],
  ["french", "fr"],
  ["german", "de"],
  ["mandarin", "zh"],
  ["cantonese", "zh"],
]);

const unique = (values) => [...new Set(values.filter(Boolean))];

const advisorNameFrom = (value) =>
  String(value ?? "")
    .replace(/†/gu, "")
    .replace(/,\s*(?:CPA|CA|EA|MBA|CMA|CFA)(?:\s*,.*)?$/iu, "")
    .trim();

const certificationId = (value) => {
  const text = String(value).toLocaleLowerCase();
  if (/online.*level\s*2/iu.test(text)) return "quickbooks_online_level_2";
  if (/online/iu.test(text)) return "quickbooks_online";
  if (/desktop.*advanced/iu.test(text)) return "quickbooks_desktop_advanced";
  if (/desktop/iu.test(text)) return "quickbooks_desktop";
  if (/enterprise/iu.test(text)) return "quickbooks_enterprise";
  if (/point of sale/iu.test(text)) return "quickbooks_point_of_sale";
  if (/payroll/iu.test(text)) return "quickbooks_payroll";
  return null;
};

export const parseQuickBooksAddress = (
  addressLines = [],
  { country = "United States", countryCode = "US" } = {},
) => {
  const address = addressLines.filter(Boolean).join(", ") || null;
  if (countryCode === "GB") {
    const locality = addressLines
      .at(-1)
      ?.match(/^(.+?)(?:,)?\s+([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/iu);
    const city = locality?.[1]
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .at(-1);
    return {
      address,
      city: city ?? null,
      region: null,
      postalCode:
        locality?.[2]?.toLocaleUpperCase().replace(/\s+/gu, " ") ?? null,
      country,
      countryCode,
    };
  }
  const locality = addressLines
    .at(-1)
    ?.match(/^(.*?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/u);
  return {
    address,
    city: locality?.[1]?.trim() ?? null,
    region: locality?.[2] ?? null,
    postalCode: locality?.[3] ?? null,
    country,
    countryCode,
  };
};

const emailsFromText = (text) =>
  unique(
    [...String(text ?? "").matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu)]
      .map(([email]) => normalizeEmail(email))
      .filter(Boolean),
  );

export const parseQuickBooksSearchCards = (cards = [], limit = cards.length) =>
  cards
    .filter((card) => card?.id && card?.profileUrl)
    .slice(0, limit)
    .map((card) => ({ ...card, source: "quickbooks" }));

export const normalizeQuickBooksProfile = (
  profile,
  { locationQuery, includeRawData },
) => {
  const resolvedLocation = resolveLocation(locationQuery);
  const website = canonicalizeUrl(profile.website);
  const services = mapServices(profile.services);
  const credentials = profile.credentials ?? [];
  const certifications = unique(
    (profile.certifications ?? []).map(certificationId),
  );
  const firmTypes = [];
  if (credentials.some((value) => /accountant|CPA/iu.test(value))) {
    firmTypes.push("accounting_firm");
  }
  if (credentials.some((value) => /bookkeeper/iu.test(value))) {
    firmTypes.push("bookkeeping_firm");
  }
  if (firmTypes.length === 0) firmTypes.push("unknown");

  return {
    firmName: profile.firmName || advisorNameFrom(profile.fullName),
    advisorNames: unique([advisorNameFrom(profile.fullName)]),
    firmTypes,
    locations: [
      parseQuickBooksAddress(profile.addressLines, {
        country: resolvedLocation.country ?? "United States",
        countryCode: resolvedLocation.countryCode ?? "US",
      }),
    ],
    website,
    domain: domainFromUrl(website),
    phoneNumbers: unique(profile.phoneNumbers ?? []),
    emails: emailsFromText(profile.description).map((email) => ({
      email,
      type: classifyEmail(email),
      source: "quickbooks",
    })),
    services,
    industriesServed: mapIndustries(profile.industries),
    softwarePlatforms: [
      {
        platform: "quickbooks",
        relationship: "proadvisor",
        certifications,
        specialties: services,
        profileUrl: profile.profileUrl,
        source: "quickbooks",
      },
    ],
    contacts: [
      {
        name: advisorNameFrom(profile.fullName),
        role: null,
        email: null,
        phone: null,
        profileUrl: profile.profileUrl,
        source: "quickbooks",
      },
    ],
    socialLinks: {
      linkedin: profile.socialLinks?.linkedin ?? null,
      facebook: profile.socialLinks?.facebook ?? null,
      instagram: profile.socialLinks?.instagram ?? null,
      x: profile.socialLinks?.x ?? null,
    },
    languages: unique(
      (profile.languages ?? []).map((language) =>
        languageCodes.get(String(language).toLocaleLowerCase()),
      ),
    ),
    descriptionOriginal: profile.description || null,
    descriptionNormalized: null,
    sourcePlatforms: ["quickbooks"],
    sourceRecords: [
      {
        source: "quickbooks",
        profileUrl: profile.profileUrl,
        locationQuery,
      },
    ],
    rawData: includeRawData
      ? {
          quickbooks: {
            id: profile.id,
            credentials,
            certifications: profile.certifications ?? [],
          },
        }
      : null,
  };
};
