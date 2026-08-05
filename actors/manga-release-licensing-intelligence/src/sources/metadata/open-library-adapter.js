import { calculateMatchConfidence } from '../../identity/calculate-match-confidence.js';
import { normalizeEdition } from '../../identity/normalize-edition.js';
import { parseIsbn } from '../../identity/parse-isbn.js';
import { requestJson } from '../../runtime/request-json.js';

const OPEN_LIBRARY_ENDPOINT = 'https://openlibrary.org/search.json';

const first = (value) => (Array.isArray(value) ? value[0] : value);

const firstValidIsbn = (values = []) => values.map((value) => parseIsbn(value)).find(Boolean) ?? null;

const isMangaLikeDocument = (document) => {
    const searchableText = [document?.title, ...(document?.subject ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('en-US');
    return !/(?:\banime\b|television program|film guide|soundtrack)/.test(searchableText);
};

const mapDocument = (document) => {
    if (!isMangaLikeDocument(document)) return null;
    const key = typeof document?.key === 'string' ? document.key : '';
    const workKey = key.startsWith('/works/') ? key.slice('/works/'.length) : null;
    const canonicalTitle = document?.title;
    if (!workKey || !canonicalTitle) return null;
    const work = {
        workId: `openlibrary:${workKey}`,
        canonicalTitle,
        nativeTitle: null,
        aliases: [],
        authors: (document.author_name ?? []).map((name) => ({ name, role: null })),
        originalCountryCode: null,
        originalLanguageCode: first(document.language) ?? null,
        publicationStatus: 'unknown',
        originalPublisher: first(document.publisher) ?? null,
        latestOriginalVolume: null,
        metadataSourceIds: { openlibrary: workKey },
    };
    const isbn = firstValidIsbn(document.isbn ?? []);
    const edition = normalizeEdition({
        workId: work.workId,
        countryCode: null,
        languageCode: first(document.language) ?? null,
        publisher: first(document.publisher) ?? null,
        title: canonicalTitle,
        isbn: isbn?.isbn13 ?? null,
        releaseDate: document.first_publish_year ? `${document.first_publish_year}-01-01` : null,
    });
    return { work, editions: [edition] };
};

export const createOpenLibraryAdapter = ({ fetchImpl = globalThis.fetch, timeoutMs = 25_000, circuitBreaker } = {}) => ({
    name: 'openlibrary',
    search: async (query, { signal } = {}) => {
        const url = new URL(OPEN_LIBRARY_ENDPOINT);
        url.searchParams.set('title', query);
        url.searchParams.set('limit', '10');
        url.searchParams.set('page', '1');
        const payload = await requestJson(url, { fetchImpl, timeoutMs, signal, sourceName: 'openlibrary', circuitBreaker });
        const mapped = (payload?.docs ?? [])
            .map(mapDocument)
            .filter(Boolean)
            .map((candidate) => ({
                ...candidate,
                match: calculateMatchConfidence(query, candidate.work),
            }))
            .sort((left, right) => right.match.confidence - left.match.confidence)
            .find((candidate) => candidate.match.status === 'matched');
        if (!mapped) return null;
        return {
            ...mapped,
            source: {
                sourceType: 'metadata',
                sourceName: 'openlibrary',
                sourceUrl: url.toString(),
                confidence: 'medium',
                retrievedAt: new Date().toISOString(),
            },
        };
    },
});

export { OPEN_LIBRARY_ENDPOINT };
