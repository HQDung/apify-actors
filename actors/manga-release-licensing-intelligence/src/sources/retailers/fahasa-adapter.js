import { parseIsbn } from '../../identity/parse-isbn.js';
import { normalizeStockStatus } from '../../offers/normalize-stock.js';
import { deduplicateOffers } from '../../offers/deduplicate-offers.js';
import { requestText } from '../../runtime/request-text.js';
import { withRetry } from '../../runtime/retry.js';

const FAHASA_HOST = 'www.fahasa.com';

export const isAllowedFahasaUrl = (value) => {
    try {
        const url = new URL(value);
        return url.hostname === FAHASA_HOST && /\.html$/i.test(url.pathname) && !/\/(?:cart|checkout|account|login|search)(?:\/|$)/i.test(url.pathname);
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

export const collectFahasaOffers = async ({
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
    for (const productUrl of productUrls.filter(isAllowedFahasaUrl)) {
        try {
            const html = await withRetry(
                () => requestText(productUrl, { fetchImpl, timeoutMs, signal, sourceName: 'fahasa', circuitBreaker }),
                { retries: 2, delayMs: 250 },
            );
            for (const product of jsonLdProducts(html)) {
                const offerData = firstOffer(product);
                const isbn = product.isbn ?? product.gtin13 ?? null;
                const parsed = isbn ? parseIsbn(isbn) : null;
                const edition = editions.find((candidate) => parsed && (candidate.isbn13 === parsed.isbn13 || candidate.isbn10 === parsed.isbn10));
                const offer = {
                    offerId: `fahasa:${isbn ?? product.sku ?? productUrl}`,
                    editionId: edition?.editionId ?? null,
                    providerName: 'Fahasa',
                    providerType: 'retailer',
                    countryCode: 'VN',
                    languageCode: 'vi',
                    availabilityType: 'print',
                    price: Number.isFinite(Number(offerData.price)) ? Number(offerData.price) : null,
                    currency: offerData.priceCurrency ?? 'VND',
                    stockStatus: normalizeStockStatus('', offerData.availability),
                    productUrl,
                    productTitle: product.name ?? null,
                    isbn13: parsed?.isbn13 ?? null,
                    isbn10: parsed?.isbn10 ?? null,
                    format: 'paperback',
                    observedAt: new Date().toISOString(),
                };
                if (!offer.editionId) warnings.push({ code: 'OFFER_UNMATCHED_EDITION', sourceName: 'fahasa', productUrl, productTitle: offer.productTitle });
                offers.push(offer);
            }
            sources.push({ sourceType: 'retailer', sourceName: 'fahasa', sourceUrl: productUrl, confidence: 'high', retrievedAt: new Date().toISOString() });
        } catch (error) {
            warnings.push({ code: 'RETAILER_SOURCE_FAILED', sourceName: 'fahasa', sourceUrl: productUrl, message: error.message });
        }
    }
    return { offers: deduplicateOffers(offers, maxOffers), warnings, sources };
};
