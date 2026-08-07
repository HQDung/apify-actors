import { fetchJsonWithRetry } from './steam-reviews.js';

const defaultSleep = (milliseconds) =>
    new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });

export const createGameMetadataAdapter = ({ fetchImpl = globalThis.fetch, sleep = defaultSleep } = {}) => ({
    async fetchGameMetadata(appId) {
        const url = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}&l=english`;
        const body = await fetchJsonWithRetry({ fetchImpl, sleepImpl: sleep, url });
        const result = body[String(appId)];
        if (!result?.success || !result.data) throw new Error(`Steam app ${appId} was not found.`);
        return {
            steamAppId: String(appId),
            gameName: result.data.name ? String(result.data.name) : null,
            storeUrl: `https://store.steampowered.com/app/${encodeURIComponent(appId)}/`,
        };
    },
});
