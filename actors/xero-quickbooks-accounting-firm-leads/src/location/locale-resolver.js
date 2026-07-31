const XERO_LONDON_URL =
  "https://www.xero.com/uk/find-advisors/united-kingdom/england/greater-london/london-city/";
const QUICKBOOKS_URL = "https://proadvisor.intuit.com/app/accountant/search";

const countryDefinitions = [
  {
    country: "United Kingdom",
    countryCode: "GB",
    locale: "uk",
    aliases: [
      "united kingdom",
      "uk",
      "great britain",
      "england",
      "scotland",
      "wales",
    ],
    quickBooksRegion: "uk",
  },
  {
    country: "United States",
    countryCode: "US",
    locale: "us",
    aliases: ["united states", "usa", "us", "america"],
    quickBooksRegion: "us",
  },
  {
    country: "Australia",
    countryCode: "AU",
    locale: "au",
    aliases: ["australia", "au"],
    quickBooksRegion: "au",
  },
  {
    country: "Singapore",
    countryCode: "SG",
    locale: "sg",
    aliases: ["singapore", "sg"],
    quickBooksRegion: "sg",
  },
];

const cityCountryAliases = new Map([
  ["london", "GB"],
  ["sydney", "AU"],
  ["melbourne", "AU"],
  ["new york", "US"],
  ["san francisco", "US"],
]);

const countryFor = (value) => {
  const lower = String(value).toLocaleLowerCase();
  const byCountry = countryDefinitions.find((definition) =>
    definition.aliases.some((alias) =>
      new RegExp(`\\b${alias.replace(/ /gu, "\\s+")}\\b`, "u").test(lower),
    ),
  );
  if (byCountry) return byCountry;
  const cityAlias = cityCountryAliases.get(lower);
  return countryDefinitions.find(
    (definition) => definition.countryCode === cityAlias,
  );
};

const cityFor = (value, country) => {
  const firstPart = String(value).split(",")[0].trim();
  if (
    !firstPart ||
    firstPart.toLocaleLowerCase() === country?.country.toLocaleLowerCase() ||
    (!String(value).includes(",") &&
      !cityCountryAliases.has(firstPart.toLocaleLowerCase()))
  ) {
    return null;
  }
  return firstPart;
};

const xeroUrlFor = (city, country) => {
  if (!country) return null;
  if (country.countryCode === "GB" && city?.toLocaleLowerCase() === "london") {
    return XERO_LONDON_URL;
  }
  if (country.countryCode === "SG") {
    return "https://www.xero.com/sg/find-advisors/singapore/singapore-city/";
  }
  if (country.countryCode === "AU" && city?.toLocaleLowerCase() === "sydney") {
    return "https://www.xero.com/au/find-advisors/australia/new-south-wales/sydney-city/";
  }
  if (
    country.countryCode === "AU" &&
    city?.toLocaleLowerCase() === "melbourne"
  ) {
    return "https://www.xero.com/au/find-advisors/australia/victoria/melbourne-city/";
  }
  if (country.countryCode === "AU") {
    return "https://www.xero.com/au/advisors/find-advisors/?services=ACCOUNTING";
  }
  if (
    country.countryCode === "US" &&
    city?.toLocaleLowerCase() === "new york"
  ) {
    return "https://www.xero.com/us/find-advisors/united-states/new-york/new-york-city/";
  }
  if (country.countryCode === "US") {
    return "https://www.xero.com/us/advisors/";
  }
  return null;
};

export const resolveLocation = (query) => {
  const normalized = String(query).trim();
  const country = countryFor(normalized);
  const city = cityFor(normalized, country);

  return {
    query: normalized,
    city,
    country: country?.country ?? null,
    countryCode: country?.countryCode ?? null,
    locale: country?.locale ?? null,
    xeroSearchUrl: xeroUrlFor(city, country),
    quickBooksSearchUrl: country
      ? `${QUICKBOOKS_URL}?region=${country.quickBooksRegion}`
      : QUICKBOOKS_URL,
  };
};
