const XERO_LONDON_URL =
  "https://www.xero.com/uk/find-advisors/united-kingdom/england/greater-london/london-city/";
const QUICKBOOKS_URL =
  "https://proadvisor.intuit.com/app/accountant/search";

export const resolveLocation = (query) => {
  const normalized = String(query).trim();
  const lower = normalized.toLocaleLowerCase();
  const isUk = /\b(?:united kingdom|uk|great britain|england)\b/u.test(lower);
  const isLondon = /\blondon\b/u.test(lower);

  return {
    query: normalized,
    city: isLondon ? "London" : null,
    country: isUk || isLondon ? "United Kingdom" : null,
    countryCode: isUk || isLondon ? "GB" : null,
    locale: isUk || isLondon ? "uk" : null,
    xeroSearchUrl: isLondon ? XERO_LONDON_URL : null,
    quickBooksSearchUrl: isUk || isLondon
      ? `${QUICKBOOKS_URL}?region=uk`
      : QUICKBOOKS_URL,
  };
};
