export const resolveSearchConfig = (input, config) => {
    const multiSearch = config.multiSearch;

    if (multiSearch) {
        const searchLocation = String(
            input[multiSearch.locationInputField] ?? input.location ?? config.defaultLocation,
        ).trim();
        const searchTypes = (
            Array.isArray(input[multiSearch.typeInputField]) && input[multiSearch.typeInputField].length
                ? input[multiSearch.typeInputField]
                : [input.keyword ?? config.defaultKeyword]
        )
            .map((searchType) => String(searchType).trim())
            .filter(Boolean);
        const maxResults = Number(
            input[multiSearch.maxResultsInputField] ?? input.maxResults ?? 20,
        );

        return { searchLocation, searchTypes, maxResults };
    }

    const searchType = String(input.keyword ?? config.defaultKeyword).trim();
    const searchLocation = String(input.location ?? config.defaultLocation).trim();

    return {
        searchLocation,
        searchTypes: [searchType],
        maxResults: Number(input.maxResults ?? 20),
    };
};

export const getSearchQuery = (type, searchLocation, searchQueryTemplate) => {
    return searchQueryTemplate
        .replaceAll('{type}', type)
        .replaceAll('{keyword}', type)
        .replaceAll('{location}', searchLocation)
        .replaceAll('{city}', searchLocation);
};

export const extractEmailsFromText = (text) => {
    const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];

    return [...new Set(matches)]
        .map((email) => email.toLowerCase())
        .filter((email) => {
            return !email.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)
                && !email.includes('example.com')
                && !email.includes('yourdomain.com')
                && !email.includes('domain.com');
        });
};

export const getLeadScore = (item) => {
    let score = 0;

    if (item.email) score += 40;
    if (item.website) score += 20;
    if (item.phone) score += 15;
    if (Number(item.rating) >= 4) score += 10;
    if (item.address) score += 5;
    if (item.googleMapsUrl) score += 5;

    return Math.min(score, 100);
};

export const getLeadQuality = (score) => {
    if (score >= 75) return 'high';
    if (score >= 45) return 'medium';

    return 'low';
};

export const getDedupeKey = (item) => {
    if (item.googleMapsUrl) return `url:${item.googleMapsUrl}`;
    if (item.name && item.address) {
        return `name-address:${item.name.toLowerCase()}|${item.address.toLowerCase()}`;
    }

    return null;
};
