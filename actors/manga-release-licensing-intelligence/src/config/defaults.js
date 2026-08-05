export const DEFAULT_ACTOR_VERSION = '0.1.0';

export const DEFAULT_INPUT = {
    mode: 'titleLookup',
    titles: ['One Piece'],
    markets: [{ countryCode: 'US', languageCode: 'en' }],
    publisherUrls: [],
    editionUrls: [],
    dateFrom: '',
    dateTo: '',
    maxTitles: 1,
    maxEditionsPerTitle: 3,
    maxOffersPerEdition: 2,
    includeMetadata: true,
    includeLicensing: true,
    includeOfficialAvailability: true,
    includeRetailOffers: false,
    includeReleaseGap: false,
    detectChanges: false,
    previousDatasetId: '',
    normalizedOutputLanguage: 'en',
    preserveOriginalText: true,
    requestTimeoutSecs: 25,
    maxConcurrency: 2,
    proxyConfiguration: { useApifyProxy: false },
    debug: false,
};

export const cloneDefaultInput = () => structuredClone(DEFAULT_INPUT);
