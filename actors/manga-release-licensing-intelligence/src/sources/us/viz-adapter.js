import { normalizeEdition } from '../../identity/normalize-edition.js';
import { normalizeTitle } from '../../identity/normalize-title.js';
import { requestText } from '../../runtime/request-text.js';
import { withRetry } from '../../runtime/retry.js';

const VIZ_HOST = 'www.viz.com';
const VIZ_BASE = `https://${VIZ_HOST}`;

const emptyResult = () => ({
    license: {
        status: 'unknown',
        localPublisher: null,
        imprint: null,
        confidence: 'low',
        sourceUrl: null,
    },
    officialAvailability: {
        isAvailable: null,
        printAvailable: null,
        digitalAvailable: null,
        subscriptionAvailable: null,
        freeOfficialReadingAvailable: null,
        links: [],
    },
    localizedRelease: {},
    editions: [],
    sources: [],
    warnings: [],
});

const absoluteUrl = (href) => {
    try {
        return new URL(href, VIZ_BASE).toString();
    } catch {
        return null;
    }
};

export const isAllowedVizUrl = (value) => {
    try {
        const url = new URL(value);
        if (url.hostname !== VIZ_HOST || !url.pathname.startsWith('/manga-books/manga/')) return false;
        if (/preview|chapter|page|image|\.(?:jpg|jpeg|png|gif|webp)$/i.test(url.pathname)) return false;
        return !url.pathname.includes('/products/');
    } catch {
        return false;
    }
};

const slugFor = (title) => normalizeTitle(title).replace(/\s+/g, '-');

const jsonLdValues = (html) => {
    const values = [];
    for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            const parsed = JSON.parse(match[1].trim());
            values.push(...(Array.isArray(parsed) ? parsed : [parsed]));
        } catch {
            // Invalid structured data is ignored; the surrounding page remains usable.
        }
    }
    return values;
};

const productLinksFor = (html) =>
    [...html.matchAll(/href=["']([^"']*\/manga-books\/manga\/[^"']*\/product\/\d+)["']/gi)]
        .map((match) => absoluteUrl(match[1]))
        .filter((url) => url && isAllowedVizUrl(url))
        .filter((url, index, urls) => urls.indexOf(url) === index);

const readingLinksFor = (html) =>
    [...html.matchAll(/href=["']([^"']+)["']/gi)]
        .map((match) => absoluteUrl(match[1]))
        .filter((url) => url && /www\.viz\.com\/(?:shonenjump|vizmanga)\b/i.test(url))
        .map((url) => ({
            url,
            providerName: 'VIZ',
            availabilityType: /vizmanga/i.test(url) ? 'subscription' : 'subscription',
        }))
        .filter((link, index, links) => links.findIndex((candidate) => candidate.url === link.url) === index);

const stripHtml = (value) => String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&times;/g, '×')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const classFieldFor = (html, className) => {
    const match = html.match(new RegExp(`<div[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`, 'i'));
    return stripHtml(match?.[1]);
};

const headingFor = (html) => {
    const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
        .map((match) => stripHtml(match[1]))
        .filter(Boolean);
    return headings.find((heading) => /\b(?:vol(?:ume)?|tập)\b/i.test(heading)) ?? headings.at(-1) ?? null;
};

const dateFor = (value) => {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const longDate = value.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
    if (longDate) {
        const month = new Map([
            ['january', 1], ['february', 2], ['march', 3], ['april', 4], ['may', 5], ['june', 6],
            ['july', 7], ['august', 8], ['september', 9], ['october', 10], ['november', 11], ['december', 12],
        ]).get(longDate[1].toLowerCase());
        if (month) return `${longDate[3]}-${String(month).padStart(2, '0')}-${longDate[2].padStart(2, '0')}`;
    }
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? value : new Date(timestamp).toISOString().slice(0, 10);
};

const productFromHtml = (html, productUrl, workId) => {
    const product = jsonLdValues(html).find((value) => value?.['@type'] === 'Product') ?? {};
    const title = headingFor(html) || product.name || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || null;
    const isbnValue = classFieldFor(html, 'o_isbn13').replace(/^ISBN-13\s*/i, '')
        || product.isbn
        || product.gtin13
        || html.match(/ISBN(?:-13)?\s*:?\s*([0-9Xx-]{10,17})/i)?.[1]
        || null;
    const releaseField = classFieldFor(html, 'o_release-date').replace(/^Release\s*/i, '').trim();
    const fallbackReleaseDate = releaseField || html.match(/Release Date\s*:?\s*([^<\n]+)/i)?.[1]?.trim() || null;
    const releaseDate = dateFor(product.releaseDate ?? fallbackReleaseDate);
    const imprint = classFieldFor(html, 'o_imprint').replace(/^Imprint\s*/i, '').trim()
        || stripHtml(html.match(/<strong>Imprint<\/strong>([\s\S]*?)(?:<\/div>|<\/p>)/i)?.[1]).replace(/^Imprint\s*/i, '').trim()
        || null;
    const lowerText = `${title ?? ''} ${html.slice(0, 20_000)}`.toLocaleLowerCase('en-US');
    const format = /\/digital(?:$|[?#])/i.test(productUrl)
        ? 'ebook'
        : /\bhardcover\b/.test(lowerText)
            ? 'hardcover'
            : 'paperback';
    return normalizeEdition({
        workId,
        countryCode: 'US',
        languageCode: 'en',
        publisher: 'VIZ Media',
        imprint,
        title,
        productUrl,
        isbn: isbnValue,
        format,
        releaseDate,
    });
};

export const collectVizSignals = async ({
    work,
    market,
    fetchImpl = globalThis.fetch,
    timeoutMs = 25_000,
    maxEditions = 3,
    signal,
    circuitBreaker,
}) => {
    const result = emptyResult();
    if (market.countryCode !== 'US' || market.languageCode !== 'en') return result;
    const seriesUrl = `${VIZ_BASE}/manga-books/manga/${slugFor(work.canonicalTitle)}/all`;
    if (!isAllowedVizUrl(seriesUrl)) {
        result.warnings.push({ code: 'PUBLISHER_SOURCE_FAILED', sourceName: 'viz', message: 'Generated URL failed allowlist.' });
        return result;
    }
    let seriesHtml;
    try {
        seriesHtml = await withRetry(
            () => requestText(seriesUrl, { fetchImpl, timeoutMs, signal, sourceName: 'viz', circuitBreaker }),
            { retries: 2, delayMs: 250 },
        );
    } catch (error) {
        result.warnings.push({ code: 'PUBLISHER_SOURCE_FAILED', sourceName: 'viz', sourceUrl: seriesUrl, message: error.message });
        return result;
    }

    result.license = {
        status: 'licenseSignalFound',
        localPublisher: 'VIZ Media',
        imprint: null,
        confidence: 'official',
        sourceUrl: seriesUrl,
    };
    result.officialAvailability.isAvailable = true;
    result.officialAvailability.links = readingLinksFor(seriesHtml);
    result.officialAvailability.subscriptionAvailable = result.officialAvailability.links.length ? true : null;
    result.sources.push({
        sourceType: 'publisher',
        sourceName: 'viz',
        sourceUrl: seriesUrl,
        confidence: 'official',
        retrievedAt: new Date().toISOString(),
    });

    const productUrls = productLinksFor(seriesHtml).slice(0, maxEditions);
    for (const productUrl of productUrls) {
        try {
            const html = await withRetry(
                () => requestText(productUrl, { fetchImpl, timeoutMs, signal, sourceName: 'viz', circuitBreaker }),
                { retries: 2, delayMs: 250 },
            );
            const edition = productFromHtml(html, productUrl, work.workId);
            result.editions.push(edition);
            if (edition.format === 'ebook') result.officialAvailability.digitalAvailable = true;
            if (edition.format === 'paperback' || edition.format === 'hardcover') result.officialAvailability.printAvailable = true;
            result.sources.push({
                sourceType: 'publisher',
                sourceName: 'viz',
                sourceUrl: productUrl,
                confidence: 'official',
                retrievedAt: new Date().toISOString(),
            });
        } catch (error) {
            result.warnings.push({ code: error.code ?? 'PUBLISHER_SOURCE_FAILED', sourceName: 'viz', sourceUrl: productUrl, message: error.message });
        }
    }
    return result;
};
