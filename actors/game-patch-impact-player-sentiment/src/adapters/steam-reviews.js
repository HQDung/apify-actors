import { HTTP_TIMEOUT_MS, MAX_RETRIES, RETRY_BASE_MS, REVIEWS_PER_PAGE } from '../config.js';
import { assignReviewPeriod } from '../domain/comparison-window.js';

const sleep = (milliseconds) =>
    new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });

const retryableStatus = (status) => status === 408 || status === 425 || status === 429 || status >= 500;

const finiteNumber = (value, fallback = null) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const timestampToIso = (value) => {
    const timestamp = finiteNumber(value);
    if (timestamp === null || timestamp <= 0) return null;
    return new Date(timestamp * 1000).toISOString();
};

export const fetchJsonWithRetry = async ({ fetchImpl, sleepImpl, url, maxAttempts = MAX_RETRIES }) => {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
        try {
            const response = await fetchImpl(url, {
                headers: { accept: 'application/json', 'user-agent': 'game-patch-impact-player-sentiment/0.1' },
                signal: controller.signal,
            });
            if (!response.ok) {
                const error = new Error(`Steam returned HTTP ${response.status}.`);
                error.status = response.status;
                throw error;
            }
            return await response.json();
        } catch (error) {
            lastError = error;
            const retryable =
                retryableStatus(error.status) ||
                error.name === 'AbortError' ||
                /network|fetch failed|timed out/i.test(error.message);
            if (!retryable || attempt === maxAttempts) throw error;
            await sleepImpl(Math.min(2000, RETRY_BASE_MS * 2 ** (attempt - 1)));
        } finally {
            clearTimeout(timeout);
        }
    }
    throw lastError;
};

export const buildReviewsUrl = ({
    appId,
    language = 'english',
    includeOffTopicReviews = false,
    cursor = '*',
    numPerPage = REVIEWS_PER_PAGE,
}) => {
    const params = new URLSearchParams({
        json: '1',
        filter: 'recent',
        language,
        review_type: 'all',
        purchase_type: 'all',
        num_per_page: String(Math.min(REVIEWS_PER_PAGE, numPerPage)),
        cursor,
    });
    if (includeOffTopicReviews) params.set('filter_offtopic_activity', '0');
    return `https://store.steampowered.com/appreviews/${encodeURIComponent(appId)}?${params.toString()}`;
};

export const normalizeSteamReview = ({ appId, review }) => ({
    id: String(review.recommendationid ?? ''),
    source: 'steam',
    appId: String(appId),
    text: String(review.review ?? '').trim(),
    language: review.language ? String(review.language) : null,
    createdAt: timestampToIso(review.timestamp_created),
    updatedAt: timestampToIso(review.timestamp_updated),
    positive: Boolean(review.voted_up),
    rating: review.voted_up ? 1 : 0,
    playtimeMinutes: finiteNumber(review.author?.playtime_forever),
    playtimeAtReviewMinutes: finiteNumber(review.author?.playtime_at_review),
    helpfulVotes: finiteNumber(review.votes_up, 0),
    funnyVotes: finiteNumber(review.votes_funny, 0),
    commentCount: finiteNumber(review.comment_count, 0),
    steamPurchase: typeof review.steam_purchase === 'boolean' ? review.steam_purchase : null,
    receivedForFree: typeof review.received_for_free === 'boolean' ? review.received_for_free : null,
    writtenDuringEarlyAccess:
        typeof review.written_during_early_access === 'boolean' ? review.written_during_early_access : null,
    developerResponse: review.developer_response ? String(review.developer_response).trim() : null,
});

export const createSteamReviewsAdapter = ({ fetchImpl = globalThis.fetch, sleep: sleepImpl = sleep } = {}) => {
    const fetchReviewPage = async ({ appId, language = 'english', includeOffTopicReviews = false, cursor = '*' }) => {
        const body = await fetchJsonWithRetry({
            fetchImpl,
            sleepImpl,
            url: buildReviewsUrl({ appId, language, includeOffTopicReviews, cursor }),
        });
        if (body?.success !== 1) throw new Error('Steam review response reported success=0.');
        if (!Array.isArray(body.reviews)) throw new Error('Steam review response did not contain a reviews array.');
        return body;
    };

    const iterateRecentReviews = async ({
        appId,
        language = 'english',
        includeOffTopicReviews = false,
        windows,
        now = new Date().toISOString(),
        maxPages = 30,
    }) => {
        const reviews = [];
        const seenReviewIds = new Set();
        const seenCursors = new Set(['*']);
        let cursor = '*';
        let pagesFetched = 0;
        let scannedReviews = 0;
        let reachedRequestedStart = false;
        let cursorLoopDetected = false;
        let newestReviewAt = null;
        let oldestReviewAt = null;
        while (pagesFetched < maxPages && !reachedRequestedStart) {
            const page = await fetchReviewPage({ appId, language, includeOffTopicReviews, cursor });
            pagesFetched += 1;
            scannedReviews += page.reviews.length;
            for (const rawReview of page.reviews) {
                const normalized = normalizeSteamReview({ appId, review: rawReview });
                const { createdAt } = normalized;
                if (!createdAt) continue;
                newestReviewAt = newestReviewAt && newestReviewAt > createdAt ? newestReviewAt : createdAt;
                oldestReviewAt = oldestReviewAt && oldestReviewAt < createdAt ? oldestReviewAt : createdAt;
                const createdMs = new Date(createdAt).getTime();
                const startMs = new Date(windows.before.startAt).getTime();
                if (!seenReviewIds.has(normalized.id)) {
                    seenReviewIds.add(normalized.id);
                    const period = assignReviewPeriod(createdAt, {
                        ...windows,
                        after: { ...windows.after, endAt: now },
                    });
                    if (period) reviews.push(normalized);
                }
                if (createdMs <= startMs) {
                    reachedRequestedStart = true;
                    break;
                }
            }
            if (reachedRequestedStart || page.reviews.length === 0) break;
            const nextCursor = page.cursor ? String(page.cursor) : '';
            if (!nextCursor || nextCursor === cursor || seenCursors.has(nextCursor)) {
                cursorLoopDetected = Boolean(nextCursor && (nextCursor === cursor || seenCursors.has(nextCursor)));
                break;
            }
            seenCursors.add(nextCursor);
            cursor = nextCursor;
        }
        return {
            reviews,
            pagesFetched,
            scannedReviews,
            reachedRequestedStart,
            truncatedByPageLimit: pagesFetched >= maxPages && !reachedRequestedStart,
            cursorLoopDetected,
            observedTimestamps: reviews.map(({ createdAt }) => createdAt),
            newestReviewAt,
            oldestReviewAt,
        };
    };

    return { fetchReviewPage, iterateRecentReviews };
};
