const canonicalUrlFor = (value) => {
    try {
        const url = new URL(value);
        url.search = '';
        url.hash = '';
        return url.toString();
    } catch {
        return String(value ?? '');
    }
};

export const deduplicateOffers = (offers, maxOffers = Number.POSITIVE_INFINITY) => {
    const seen = new Set();
    const output = [];
    for (const offer of offers ?? []) {
        const key = [
            offer.providerName,
            offer.editionId ?? offer.isbn13 ?? offer.isbn10 ?? '',
            offer.availabilityType ?? '',
            canonicalUrlFor(offer.productUrl),
        ].join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        output.push({ ...offer, productUrl: canonicalUrlFor(offer.productUrl) });
        if (output.length >= maxOffers) break;
    }
    return output;
};

export { canonicalUrlFor };
