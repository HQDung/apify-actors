import { parseIsbn } from '../../identity/parse-isbn.js';
import { normalizeStockStatus } from '../../offers/normalize-stock.js';
import { deduplicateOffers } from '../../offers/deduplicate-offers.js';
import { requestText } from '../../runtime/request-text.js';
import { withRetry } from '../../runtime/retry.js';

const BARNES_HOST = 'www.barnesandnoble.com';

export const isAllowedBarnesNobleUrl = (value) => {
    try {
        const url = new URL(value);
        return url.hostname === BARNES_HOST && url.pathname.startsWith('/w/') && !/\/(?:cart|checkout|account|login)(?:\/|$)/i.test(url.pathname);
    } catch {
        return false;
    }
};

const jsonLdProducts = (html) => {
    const products = [];
    for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            const parsed = JSON.parse(match[1].trim());
            const values = Array.isArray(parsed) ? parsed : [parsed];
            const graphValues = values.flatMap((value) => value?.['@graph'] ?? [value]);
            products.push(...graphValues.filter((value) => Array.isArray(value?.['@type']) ? value['@type'].includes('Product') : value?.['@type'] === 'Product'));
        } catch {
            // Ignore malformed optional JSON-LD blocks.
        }
    }
    return products;
};

const firstOffer = (product) => Array.isArray(product.offers) ? product.offers[0] ?? {} : product.offers ?? {};

const formatFor = (title) => /ebook|e-book|nook|digital/i.test(title ?? '') ? 'ebook' : /hardcover/i.test(title ?? '') ? 'hardcover' : 'paperback';

const editionIdFor = (products, editions, isbn) => {
    const parsed = isbn ? parseIsbn(isbn) : null;
    const match = editions.find((edition) => parsed && (edition.isbn13 === parsed.isbn13 || edition.isbn10 === parsed.isbn10));
    return match?.editionId ?? null;
};

export const collectBarnesNobleOffers = async ({
    work,
    editions = [],
    productUrls = [],
    fetchImpl = globalThis.fetch,
    timeoutMs = 25_000,
    maxOffers = 20,
    signal,
    circuitBreaker,
}) => {
    const offers = [];
    const warnings = [];
    const sources = [];
    for (const productUrl of productUrls.filter(isAllowedBarnesNobleUrl)) {
        try {
            const html = await withRetry(
                () => requestText(productUrl, { fetchImpl, timeoutMs, signal, sourceName: 'barnesnoble', circuitBreaker }),
                { retries: 2, delayMs: 250 },
            );
            for (const product of jsonLdProducts(html)) {
                const offerData = firstOffer(product);
                const isbn = product.isbn
                    ?? product.gtin13
                    ?? offerData.url?.match(/[?&]ean=([0-9Xx-]{10,17})/i)?.[1]
                    ?? product.image?.match(/(\d{13})_p\./i)?.[1]
                    ?? null;
                const format = formatFor(product.name);
                const offer = {
                    offerId: `barnesnoble:${isbn ?? product.sku ?? productUrl}:${format}`,
                    editionId: editionIdFor(product, editions, isbn),
                    providerName: 'Barnes & Noble',
                    providerType: 'retailer',
                    countryCode: 'US',
                    languageCode: 'en',
                    availabilityType: format === 'ebook' ? 'digitalPurchase' : 'print',
                    price: Number.isFinite(Number(offerData.price)) ? Number(offerData.price) : null,
                    currency: offerData.priceCurrency ?? 'USD',
                    stockStatus: normalizeStockStatus('', offerData.availability),
                    productUrl: offerData.url ?? product.url ?? productUrl,
                    productTitle: product.name ?? null,
                    isbn13: parseIsbn(isbn)?.isbn13 ?? null,
                    isbn10: parseIsbn(isbn)?.isbn10 ?? null,
                    format,
                    observedAt: new Date().toISOString(),
                };
                if (!offer.editionId) warnings.push({ code: 'OFFER_UNMATCHED_EDITION', sourceName: 'barnesnoble', productUrl, productTitle: offer.productTitle });
                offers.push(offer);
            }
            sources.push({ sourceType: 'retailer', sourceName: 'barnesnoble', sourceUrl: productUrl, confidence: 'high', retrievedAt: new Date().toISOString() });
        } catch (error) {
            warnings.push({ code: 'RETAILER_SOURCE_FAILED', sourceName: 'barnesnoble', sourceUrl: productUrl, message: error.message });
        }
    }
    return { offers: deduplicateOffers(offers, maxOffers), warnings, sources };
};
