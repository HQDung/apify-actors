import { MAX_NEWS_ITEMS } from '../config.js';
import { fetchJsonWithRetry } from './steam-reviews.js';

const defaultSleep = (milliseconds) =>
    new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });

const dateToIso = (value) => {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
    return new Date(timestamp * 1000).toISOString();
};

export const createSteamNewsAdapter = ({ fetchImpl = globalThis.fetch, sleep = defaultSleep } = {}) => ({
    async fetchGameNews(appId) {
        const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${encodeURIComponent(appId)}&count=${MAX_NEWS_ITEMS}&maxlength=0`;
        const body = await fetchJsonWithRetry({ fetchImpl, sleepImpl: sleep, url });
        const items = Array.isArray(body?.appnews?.newsitems) ? body.appnews.newsitems : [];
        return items.slice(0, MAX_NEWS_ITEMS).map((item) => ({
            id: String(item.gid ?? item.url ?? item.title ?? ''),
            title: String(item.title ?? '').trim(),
            content: String(item.contents ?? '').trim(),
            publishedAt: dateToIso(item.date),
            url: item.url ? String(item.url) : null,
            source: 'steam_news',
            isExternal: Boolean(item.is_external_url) && !/steam_community_announcements/i.test(String(item.url ?? '')),
        }));
    },
});
