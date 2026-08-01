import { parseStoreHtml } from './parse-store-html.js';

const userAgent = 'Mozilla/5.0 (compatible; GooglePlayFeedbackAnalyzer/0.1)';

const diagnostic = ({ appId, language, country, url, status, responseBytes, collectionMode = 'html' }) => ({
    appId,
    language,
    country,
    url,
    httpStatus: status,
    responseBytes,
    collectionMode,
});

export const collectGooglePlayReviews = async ({
    appId,
    language,
    country,
    maxReviewsPerApp,
    sort = 'mostRelevant',
    fetchImpl = globalThis.fetch,
    requestTimeoutSecs = 30,
}) => {
    const url = new URL('https://play.google.com/store/apps/details');
    url.searchParams.set('id', appId);
    url.searchParams.set('hl', language);
    url.searchParams.set('gl', country);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutSecs * 1000);
    try {
        const response = await fetchImpl(url, {
            headers: {
                accept: 'text/html,application/xhtml+xml',
                'accept-language': `${language}-${country},${language};q=0.9`,
                'user-agent': userAgent,
            },
            signal: controller.signal,
        });
        const body = await response.text();
        const details = diagnostic({
            appId,
            language,
            country,
            url: url.toString(),
            status: response.status,
            responseBytes: Buffer.byteLength(body),
        });

        if (!response.ok) {
            return {
                records: [],
                diagnostics: details,
                error: {
                    code: 'GOOGLE_PLAY_HTTP_ERROR',
                    message: `Google Play returned HTTP ${response.status}`,
                    httpStatus: response.status,
                },
            };
        }

        const parsed = parseStoreHtml(body, { appId, language, country });
        return {
            records: parsed.reviews.slice(0, maxReviewsPerApp),
            diagnostics: { ...details, parsedReviewCount: parsed.reviews.length, requestedSort: sort },
        };
    } catch (error) {
        return {
            records: [],
            diagnostics: diagnostic({ appId, language, country, url: url.toString(), status: null }),
            error: {
                code: error.name === 'AbortError' ? 'GOOGLE_PLAY_TIMEOUT' : 'GOOGLE_PLAY_FETCH_ERROR',
                message: error.message,
            },
        };
    } finally {
        clearTimeout(timeout);
    }
};
