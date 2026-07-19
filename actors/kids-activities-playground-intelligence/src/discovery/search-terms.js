import { localeKeywords } from "../locales/index.js";

export const buildSearchTerms = ({
  venueTypes,
  customSearchTerms,
  countryCode,
}) => {
  const language = countryCode === "VN" ? "vi" : "en";
  const terms = venueTypes.flatMap(
    (type) => localeKeywords[language][type] ?? localeKeywords.en[type] ?? [],
  );
  return [
    ...new Set(
      [...terms, ...customSearchTerms]
        .map((term) => term.trim())
        .filter(Boolean),
    ),
  ];
};
