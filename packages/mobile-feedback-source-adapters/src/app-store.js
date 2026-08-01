const userAgent = 'Mozilla/5.0 (compatible; CrossPlatformMobileFeedback/0.1)';

const labelOf = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object' && value !== null && 'label' in value) return value.label === null ? null : String(value.label);
    return String(value);
};

const reviewIdOf = (entry) => {
    const raw = labelOf(entry?.id);
    if (!raw) return null;
    const queryId = raw.match(/[?&]id=([^&#]+)/i)?.[1];
    return decodeURIComponent(queryId ?? raw.split('/').filter(Boolean).at(-1));
};

const integerLabel = (value) => {
    const number = Number(labelOf(value));
    return Number.isInteger(number) && number >= 0 ? number : null;
};

export const parseAppStoreReviews = (payload, { appId, country, language }) => {
    let json;
    try {
        json = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch {
        throw new Error('APP_STORE_INVALID_RESPONSE: Apple review feed was not valid JSON');
    }
    const entries = Array.isArray(json?.feed?.entry) ? json.feed.entry : [];
    return entries.map((entry) => {
        const reviewId = reviewIdOf(entry);
        const rating = integerLabel(entry?.['im:rating']);
        if (!reviewId || rating === null || rating < 1 || rating > 5) return null;
        return {
            reviewId,
            appId,
            rating,
            title: labelOf(entry?.title) ?? '',
            text: labelOf(entry?.content) ?? '',
            reviewDateText: labelOf(entry?.updated),
            appVersion: labelOf(entry?.['im:version']),
            helpfulCount: integerLabel(entry?.['im:voteSum']),
            developerReply: null,
            source: { country, language },
        };
    }).filter(Boolean);
};

const urlFor = ({ appId, country, language, page }) => {
    const url = new URL(`https://itunes.apple.com/${country.toLowerCase()}/rss/customerreviews/id=${appId}/sortby=mostrecent/page=${page}/json`);
    url.searchParams.set('l', language);
    return url;
};

export const collectAppStoreReviews = async ({ appId, country, language, maxReviewsPerApp, maxPagesPerApp = 10, fetchImpl = globalThis.fetch, requestTimeoutSecs = 30 }) => {
    const collectedAt = new Date().toISOString();
    const records = [];
    const seenIds = new Set();
    let pagesFetched = 0;
    let parsedReviewCount = 0;
    let lastDetails = { appId, country, language, url: urlFor({ appId, country, language, page: 1 }).toString(), httpStatus: null, responseBytes: 0, collectedAt, pagesFetched, parsedReviewCount, collectionMode: 'rss-json' };

    for (let page = 1; page <= maxPagesPerApp && records.length < maxReviewsPerApp; page += 1) {
        const url = urlFor({ appId, country, language, page });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), requestTimeoutSecs * 1000);
        try {
            const response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': userAgent }, signal: controller.signal });
            const body = await response.text();
            pagesFetched += 1;
            lastDetails = { ...lastDetails, url: url.toString(), httpStatus: response.status, responseBytes: Buffer.byteLength(body), pagesFetched };
            if (!response.ok) return { records: records.slice(0, maxReviewsPerApp), diagnostics: lastDetails, error: { code: 'APP_STORE_HTTP_ERROR', message: `Apple App Store returned HTTP ${response.status}`, httpStatus: response.status } };
            const pageRecords = parseAppStoreReviews(body, { appId, country, language });
            parsedReviewCount += pageRecords.length;
            lastDetails.parsedReviewCount = parsedReviewCount;
            for (const record of pageRecords) {
                if (seenIds.has(record.reviewId)) continue;
                seenIds.add(record.reviewId);
                records.push(record);
                if (records.length >= maxReviewsPerApp) break;
            }
            if (pageRecords.length === 0) break;
        } catch (error) {
            return { records: records.slice(0, maxReviewsPerApp), diagnostics: { ...lastDetails, pagesFetched, parsedReviewCount }, error: { code: error.name === 'AbortError' ? 'APP_STORE_TIMEOUT' : error.message.startsWith('APP_STORE_INVALID_RESPONSE') ? 'APP_STORE_INVALID_RESPONSE' : 'APP_STORE_FETCH_ERROR', message: error.message } };
        } finally {
            clearTimeout(timeout);
        }
    }
    return { records: records.slice(0, maxReviewsPerApp), diagnostics: { ...lastDetails, pagesFetched, parsedReviewCount } };
};
