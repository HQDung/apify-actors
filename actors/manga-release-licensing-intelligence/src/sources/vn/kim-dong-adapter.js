import { normalizeEdition } from '../../identity/normalize-edition.js';
import { normalizeTitle } from '../../identity/normalize-title.js';
import { normalizeStockStatus } from '../../offers/normalize-stock.js';
import { requestText } from '../../runtime/request-text.js';
import { withRetry } from '../../runtime/retry.js';

const KIM_DONG_HOST = 'nxbkimdong.com.vn';
const KIM_DONG_BASE = `https://${KIM_DONG_HOST}`;
const PRIVATE_PATH = /\/(?:admin|cart|search|checkout|account|login)(?:\/|$)/i;

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
    localizedRelease: {
        latestVolumeNumber: null,
        latestVolumeLabel: null,
        latestReleaseDate: null,
        nextVolumeNumber: null,
        nextReleaseDate: null,
    },
    editions: [],
    offers: [],
    sources: [],
    warnings: [],
});

export const isAllowedKimDongUrl = (value) => {
    try {
        const url = new URL(value);
        return url.hostname === KIM_DONG_HOST && !PRIVATE_PATH.test(url.pathname) && !/\.(?:jpg|jpeg|png|gif|webp)$/i.test(url.pathname);
    } catch {
        return false;
    }
};

const absoluteUrl = (href) => {
    try {
        return new URL(href, KIM_DONG_BASE).toString();
    } catch {
        return null;
    }
};

const stripHtml = (value) => String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const jsonLdValues = (html) => {
    const values = [];
    for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            const parsed = JSON.parse(match[1].trim());
            values.push(...(Array.isArray(parsed) ? parsed : [parsed]));
        } catch {
            // A malformed optional JSON-LD block does not fail the public page.
        }
    }
    return values;
};

const slugFor = (title) => normalizeTitle(title).replace(/\s+/g, '-');

const productLinksFor = (html, categorySlug) =>
    [...html.matchAll(/href=["']([^"']+)["']/gi)]
        .map((match) => absoluteUrl(match[1]))
        .filter((url) => url && isAllowedKimDongUrl(url))
        .filter((url) => {
            const path = new URL(url).pathname;
            return path !== `/${categorySlug}` && path.startsWith(`/${categorySlug}-`);
        })
        .filter((url, index, urls) => urls.indexOf(url) === index);

const priceFor = (value, text) => {
    const candidate = value ?? text.match(/([0-9][0-9.\s,]*)\s*(?:₫|đ|VND)/i)?.[1] ?? null;
    if (candidate === null) return null;
    const normalized = String(candidate).replace(/\s/g, '').replace(/\./g, '').replace(/,(?=\d{2}$)/, '.');
    const price = Number(normalized);
    return Number.isFinite(price) ? price : null;
};

const productFromHtml = (html, productUrl, workId) => {
    const product = jsonLdValues(html).find((value) => value?.['@type'] === 'Product') ?? {};
    const text = stripHtml(html);
    const heading = stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
    const title = product.name ?? (heading || null);
    const offer = Array.isArray(product.offers) ? product.offers[0] ?? {} : product.offers ?? {};
    const availability = offer.availability ?? '';
    const isbn = product.isbn
        ?? text.match(/ISBN(?:-13)?\s*:?\s*([0-9Xx-]{10,17})/i)?.[1]
        ?? null;
    const edition = normalizeEdition({
        workId,
        countryCode: 'VN',
        languageCode: 'vi',
        publisher: 'Kim Đồng',
        title,
        isbn,
        format: 'paperback',
        releaseDate: product.releaseDate ?? null,
    });
    const stockStatus = normalizeStockStatus(text, availability);
    const offerRecord = {
        offerId: `kimdong:${product.sku ?? new URL(productUrl).pathname}`,
        editionId: edition.editionId,
        providerName: 'Kim Đồng',
        providerType: 'publisherStore',
        countryCode: 'VN',
        languageCode: 'vi',
        availabilityType: 'print',
        price: priceFor(offer.price, text),
        currency: offer.priceCurrency ?? 'VND',
        stockStatus,
        productUrl,
        productTitle: title,
        observedAt: new Date().toISOString(),
    };
    return { edition, offer: offerRecord, volumeLabel: title };
};

const volumeNumberFrom = (label) => {
    const match = String(label ?? '').match(/\bTập\s*0*(\d+)/i);
    return match ? Number(match[1]) : null;
};

export const collectKimDongSignals = async ({
    work,
    market,
    fetchImpl = globalThis.fetch,
    timeoutMs = 25_000,
    maxEditions = 3,
    signal,
    circuitBreaker,
}) => {
    const result = emptyResult();
    if (market.countryCode !== 'VN' || market.languageCode !== 'vi') return result;
    const categorySlug = slugFor(work.canonicalTitle);
    const categoryUrl = `${KIM_DONG_BASE}/${categorySlug}`;
    let categoryHtml;
    try {
        categoryHtml = await withRetry(
            () => requestText(categoryUrl, { fetchImpl, timeoutMs, signal, sourceName: 'kimdong', circuitBreaker }),
            { retries: 2, delayMs: 250 },
        );
    } catch (error) {
        result.warnings.push({ code: 'PUBLISHER_SOURCE_FAILED', sourceName: 'kimdong', sourceUrl: categoryUrl, message: error.message });
        return result;
    }
    result.license = {
        status: 'licenseSignalFound',
        localPublisher: 'Kim Đồng',
        imprint: null,
        confidence: 'official',
        sourceUrl: categoryUrl,
    };
    result.officialAvailability = {
        ...result.officialAvailability,
        isAvailable: true,
        printAvailable: true,
        links: [{ url: categoryUrl, providerName: 'Kim Đồng', availabilityType: 'publisherCatalog' }],
    };
    result.sources.push({
        sourceType: 'publisher',
        sourceName: 'kimdong',
        sourceUrl: categoryUrl,
        confidence: 'official',
        retrievedAt: new Date().toISOString(),
    });

    const productUrls = productLinksFor(categoryHtml, categorySlug).slice(0, maxEditions);
    for (const productUrl of productUrls) {
        try {
            const html = await withRetry(
                () => requestText(productUrl, { fetchImpl, timeoutMs, signal, sourceName: 'kimdong', circuitBreaker }),
                { retries: 2, delayMs: 250 },
            );
            const parsed = productFromHtml(html, productUrl, work.workId);
            result.editions.push(parsed.edition);
            result.offers.push(parsed.offer);
            const volumeNumber = volumeNumberFrom(parsed.volumeLabel);
            if (volumeNumber !== null && (result.localizedRelease.latestVolumeNumber === null || volumeNumber > result.localizedRelease.latestVolumeNumber)) {
                result.localizedRelease.latestVolumeNumber = volumeNumber;
                result.localizedRelease.latestVolumeLabel = parsed.volumeLabel;
                result.localizedRelease.latestReleaseDate = parsed.edition.releaseDate;
            }
            result.sources.push({
                sourceType: 'publisher',
                sourceName: 'kimdong',
                sourceUrl: productUrl,
                confidence: 'official',
                retrievedAt: new Date().toISOString(),
            });
        } catch (error) {
            result.warnings.push({ code: error.code ?? 'PUBLISHER_SOURCE_FAILED', sourceName: 'kimdong', sourceUrl: productUrl, message: error.message });
        }
    }
    return result;
};
