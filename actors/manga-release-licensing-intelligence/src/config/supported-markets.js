export const SUPPORTED_MARKETS = new Set(['US-en', 'VN-vi']);

export const marketCodeFor = ({ countryCode, languageCode }) =>
    `${countryCode.toUpperCase()}-${languageCode}`;

export const isSupportedMarket = (market) =>
    SUPPORTED_MARKETS.has(marketCodeFor(market));
