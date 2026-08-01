import { load } from 'cheerio';

const userAgent = 'Mozilla/5.0 (compatible; CrossPlatformMobileFeedback/0.1)';

const parseRating = (card) => {
    const ariaLabel = card.find('[aria-label*="Rated"]').first().attr('aria-label') ?? '';
    const rating = Number(ariaLabel.match(/Rated\s+(\d)/)?.[1] ?? 0);
    if (rating >= 1 && rating <= 5) return rating;
    return card.find('.iXRFPc .Z1Dz7b').length || null;
};

const parseHelpfulCount = (card) => {
    const raw = card.find('[data-original-thumbs-up-count]').first().attr('data-original-thumbs-up-count');
    if (raw === undefined) return null;
    const count = Number(raw);
    return Number.isInteger(count) && count >= 0 ? count : null;
};

const parseReply = (card) => {
    const reply = card.find('.ocpBU').first();
    if (!reply.length) return null;
    return {
        present: true,
        replyDateText: reply.find('.I9Jtec').first().text().trim() || null,
        text: reply.find('.ras4vb').first().text().trim() || null,
    };
};

export const parseGooglePlayReviews = (html, { appId, language, country }) => {
    const $ = load(String(html ?? ''));
    const reviews = [];
    const seenIds = new Set();
    $('header[data-review-id]').each((_, header) => {
        const reviewId = $(header).attr('data-review-id');
        if (!reviewId || seenIds.has(reviewId)) return;
        seenIds.add(reviewId);
        const card = $(header).closest('.EGFGHd');
        reviews.push({
            reviewId,
            appId,
            rating: parseRating(card),
            reviewDateText: card.find('.bp9Aid').first().text().trim() || null,
            text: card.find('.h3YV2d').first().text().trim() || null,
            helpfulCount: parseHelpfulCount(card),
            developerReply: parseReply(card),
            source: { language, country },
        });
    });
    return reviews;
};

export const collectGooglePlayReviews = async ({ appId, language, country, maxReviewsPerApp, fetchImpl = globalThis.fetch, requestTimeoutSecs = 30, useBrowserFallback = false }) => {
    const collectedAt = new Date().toISOString();
    const url = new URL('https://play.google.com/store/apps/details');
    url.searchParams.set('id', appId);
    url.searchParams.set('hl', language);
    url.searchParams.set('gl', country);
    const diagnostics = { appId, language, country, url: url.toString(), httpStatus: null, responseBytes: 0, collectedAt, collectionMode: 'html' };
    if (useBrowserFallback) return { records: [], diagnostics, error: { code: 'GOOGLE_PLAY_BROWSER_FALLBACK_DEFERRED', message: 'Browser review expansion is reserved for a later phase.' } };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutSecs * 1000);
    try {
        const response = await fetchImpl(url, { headers: { accept: 'text/html,application/xhtml+xml', 'accept-language': `${language}-${country},${language};q=0.9`, 'user-agent': userAgent }, signal: controller.signal });
        const body = await response.text();
        const details = { ...diagnostics, httpStatus: response.status, responseBytes: Buffer.byteLength(body) };
        if (!response.ok) return { records: [], diagnostics: details, error: { code: 'GOOGLE_PLAY_HTTP_ERROR', message: `Google Play returned HTTP ${response.status}`, httpStatus: response.status } };
        const records = parseGooglePlayReviews(body, { appId, language, country });
        return { records: records.slice(0, maxReviewsPerApp), diagnostics: { ...details, parsedReviewCount: records.length } };
    } catch (error) {
        return { records: [], diagnostics, error: { code: error.name === 'AbortError' ? 'GOOGLE_PLAY_TIMEOUT' : 'GOOGLE_PLAY_FETCH_ERROR', message: error.message } };
    } finally {
        clearTimeout(timeout);
    }
};
