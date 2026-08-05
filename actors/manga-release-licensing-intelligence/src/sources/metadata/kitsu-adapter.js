import { calculateMatchConfidence } from '../../identity/calculate-match-confidence.js';
import { addVettedLocalizedAlias } from '../../identity/localized-aliases.js';
import { requestJson } from '../../runtime/request-json.js';

const KITSU_ENDPOINT = 'https://kitsu.io/api/edge/manga';

const publicationStatusFor = (status) => {
    if (status === 'current') return 'releasing';
    if (status === 'finished') return 'finished';
    if (status === 'on_hold') return 'hiatus';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'upcoming') return 'notYetReleased';
    return 'unknown';
};

const asAliases = (titles, canonicalTitle) =>
    Object.entries(titles ?? {})
        .map(([languageCode, title]) => ({ languageCode, title }))
        .filter(({ title }) => title && title !== canonicalTitle);

const mapRecord = (record) => {
    const attributes = record?.attributes ?? {};
    const canonicalTitle = attributes.canonicalTitle ?? attributes.titles?.en;
    if (!record?.id || !canonicalTitle) return null;
    const work = {
        workId: `kitsu:${record.id}`,
        canonicalTitle,
        nativeTitle: attributes.titles?.ja_jp ?? null,
        aliases: asAliases(attributes.titles, canonicalTitle),
        authors: [],
        originalCountryCode: null,
        originalLanguageCode: null,
        publicationStatus: publicationStatusFor(attributes.status),
        originalPublisher: null,
        latestOriginalVolume: Number.isFinite(attributes.volumeCount)
            ? attributes.volumeCount
            : null,
        originalVolumeCount: Number.isFinite(attributes.volumeCount)
            ? attributes.volumeCount
            : null,
        metadataSourceIds: { kitsu: String(record.id) },
    };
    return { work };
};

const rankRecords = (query, records) =>
    records
        .map((record) => {
            const work = addVettedLocalizedAlias(query, record.work);
            return { ...record, work, match: calculateMatchConfidence(query, work) };
        })
        .sort((left, right) => right.match.confidence - left.match.confidence);

export const createKitsuAdapter = ({ fetchImpl = globalThis.fetch, timeoutMs = 25_000, circuitBreaker } = {}) => ({
    name: 'kitsu',
    search: async (query, { signal } = {}) => {
        const url = new URL(KITSU_ENDPOINT);
        url.searchParams.set('filter[text]', query);
        url.searchParams.set('page[limit]', '10');
        const payload = await requestJson(url, {
            fetchImpl,
            timeoutMs,
            signal,
            sourceName: 'kitsu',
            circuitBreaker,
            headers: { accept: 'application/vnd.api+json' },
        });
        const records = Array.isArray(payload?.data) ? payload.data : [payload?.data];
        const ranked = rankRecords(query, records.map(mapRecord).filter(Boolean));
        const mapped = ranked[0];
        if (!mapped || mapped.match.status !== 'matched') return null;
        return {
            ...mapped,
            editions: [],
            source: {
                sourceType: 'metadata',
                sourceName: 'kitsu',
                sourceUrl: url.toString(),
                confidence: 'high',
                retrievedAt: new Date().toISOString(),
            },
        };
    },
});

export { KITSU_ENDPOINT };
