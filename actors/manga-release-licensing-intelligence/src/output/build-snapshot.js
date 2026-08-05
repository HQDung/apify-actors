import { marketCodeFor } from '../config/supported-markets.js';

const emptyLicense = {
    status: 'unknown',
    localPublisher: null,
    imprint: null,
    confidence: 'low',
    sourceUrl: null,
};

const emptyRelease = {
    latestVolumeNumber: null,
    latestVolumeLabel: null,
    latestReleaseDate: null,
    nextVolumeNumber: null,
    nextReleaseDate: null,
};

const emptyGap = {
    calculated: false,
    originalLatestVolume: null,
    localizedLatestVolume: null,
    volumeGap: null,
    confidence: 'low',
    sources: [],
};

const emptyAvailability = {
    isAvailable: null,
    printAvailable: null,
    digitalAvailable: null,
    subscriptionAvailable: null,
    freeOfficialReadingAvailable: null,
    links: [],
};

const emptyRetailSummary = {
    offersCollected: 0,
    lowestPrice: null,
    highestPrice: null,
    currency: null,
    anyInStock: null,
    anyPreorder: null,
};

export const buildSnapshot = ({
    queryTitle,
    work,
    market,
    match,
    license,
    localizedRelease,
    releaseGap,
    officialAvailability,
    editions = [],
    offers = [],
    changeDetection,
    warnings = [],
    sources = [],
    scrapedAt = new Date().toISOString(),
}) => {
    if (!work?.workId || !work?.canonicalTitle) {
        throw new Error('A resolved work is required to build a snapshot.');
    }
    const normalizedMarket = {
        countryCode: market.countryCode.toUpperCase(),
        languageCode: market.languageCode.toLowerCase(),
    };
    const normalizedLicense = { ...emptyLicense, ...(license ?? {}) };
    const normalizedRelease = { ...emptyRelease, ...(localizedRelease ?? {}) };
    const normalizedGap = { ...emptyGap, ...(releaseGap ?? {}) };
    const normalizedAvailability = { ...emptyAvailability, ...(officialAvailability ?? {}) };
    const normalizedOffers = Array.isArray(offers) ? offers : [];
    const pricedOffers = normalizedOffers.filter((offer) => Number.isFinite(offer.price));
    const retailSummary = normalizedOffers.length
        ? {
              ...emptyRetailSummary,
              offersCollected: normalizedOffers.length,
              lowestPrice: pricedOffers.length ? Math.min(...pricedOffers.map((offer) => offer.price)) : null,
              highestPrice: pricedOffers.length ? Math.max(...pricedOffers.map((offer) => offer.price)) : null,
              currency: normalizedOffers.find((offer) => offer.currency)?.currency ?? null,
              anyInStock: normalizedOffers.some((offer) => offer.stockStatus === 'inStock'),
              anyPreorder: normalizedOffers.some((offer) => offer.stockStatus === 'preorder'),
          }
        : emptyRetailSummary;
    const marketCode = marketCodeFor(normalizedMarket);

    return {
        actorOutputSchemaVersion: 1,
        recordType: 'titleMarketSnapshot',
        queryTitle,
        match: match ?? { status: 'ambiguous', confidence: 0, matchedBy: [] },
        work,
        market: normalizedMarket,
        license: normalizedLicense,
        localizedRelease: normalizedRelease,
        releaseGap: normalizedGap,
        officialAvailability: normalizedAvailability,
        retailSummary,
        editions,
        offers: normalizedOffers,
        changeDetection: changeDetection ?? {
            enabled: false,
            hasChanges: false,
            changeTypes: [],
        },
        warnings,
        sources,
        scrapedAt,
        canonicalTitle: work.canonicalTitle,
        marketCode,
        licenseStatus: normalizedLicense.status,
        localPublisher: normalizedLicense.localPublisher,
        latestLocalizedVolume: normalizedRelease.latestVolumeNumber,
        volumeGap: normalizedGap.volumeGap,
        officiallyAvailable: normalizedAvailability.isAvailable,
        offersCollected: retailSummary.offersCollected,
        lowestPrice: retailSummary.lowestPrice,
        currency: retailSummary.currency,
        inStock: retailSummary.anyInStock,
    };
};
