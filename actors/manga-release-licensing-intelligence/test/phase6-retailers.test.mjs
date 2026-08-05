import test from 'node:test';
import assert from 'node:assert/strict';

import { collectBarnesNobleOffers, isAllowedBarnesNobleUrl } from '../src/sources/retailers/barnes-noble-adapter.js';
import { collectFahasaOffers, isAllowedFahasaUrl } from '../src/sources/retailers/fahasa-adapter.js';
import { normalizeEdition } from '../src/identity/normalize-edition.js';
import { deduplicateOffers } from '../src/offers/deduplicate-offers.js';
import { buildSnapshot } from '../src/output/build-snapshot.js';

const paperback = normalizeEdition({
    workId: 'kitsu:38', countryCode: 'US', languageCode: 'en', publisher: 'VIZ Media',
    title: 'One Piece Volume 1', isbn: '9781569319017', format: 'paperback',
});
const ebook = normalizeEdition({
    workId: 'kitsu:38', countryCode: 'US', languageCode: 'en', publisher: 'VIZ Media',
    title: 'One Piece Volume 1 ebook', isbn: '9781421545257', format: 'ebook',
});

const barnesHtml = `
<script type="application/ld+json">{"@type":"Product","name":"One Piece Vol. 1 paperback","isbn":"9781569319017","offers":{"price":"11.99","priceCurrency":"USD","availability":"https://schema.org/InStock"}}</script>
<script type="application/ld+json">{"@type":"Product","name":"One Piece Vol. 1 ebook","isbn":"9781421545257","offers":{"price":"6.99","priceCurrency":"USD","availability":"https://schema.org/InStock"}}</script>`;

const fahasaHtml = `
<script type="application/ld+json">{"@type":"Product","name":"One Piece - Tập 1 - Romance Dawn","brand":{"name":"Kim Đồng"},"isbn":"9786042123456","offers":{"price":"28500","priceCurrency":"VND","availability":"http://schema.org/InStock"}}</script>`;

test('retailer allowlists keep only public product routes', () => {
    assert.equal(isAllowedBarnesNobleUrl('https://www.barnesandnoble.com/w/one-piece-vol-1/1129763095'), true);
    assert.equal(isAllowedBarnesNobleUrl('https://www.barnesandnoble.com/checkout'), false);
    assert.equal(isAllowedFahasaUrl('https://www.fahasa.com/one-piece-tap-1.html'), true);
    assert.equal(isAllowedFahasaUrl('https://www.fahasa.com/cart'), false);
});

test('Barnes & Noble maps paperback and ebook variants independently', async () => {
    const result = await collectBarnesNobleOffers({
        work: { workId: 'kitsu:38', canonicalTitle: 'One Piece' },
        editions: [paperback, ebook],
        productUrls: ['https://www.barnesandnoble.com/w/one-piece-vol-1/1129763095'],
        fetchImpl: async () => new Response(barnesHtml, { status: 200 }),
    });

    assert.equal(result.offers.length, 2);
    assert.equal(result.offers.find((offer) => offer.editionId === paperback.editionId).price, 11.99);
    assert.equal(result.offers.find((offer) => offer.editionId === ebook.editionId).availabilityType, 'digitalPurchase');
    assert.ok(result.offers.every((offer) => offer.stockStatus === 'inStock'));
});

test('Fahasa maps Vietnamese product JSON-LD to a VND in-stock offer', async () => {
    const result = await collectFahasaOffers({
        work: { workId: 'kitsu:38', canonicalTitle: 'One Piece' },
        editions: [],
        productUrls: ['https://www.fahasa.com/one-piece-tap-1.html'],
        fetchImpl: async () => new Response(fahasaHtml, { status: 200 }),
    });

    assert.equal(result.offers.length, 1);
    assert.equal(result.offers[0].price, 28500);
    assert.equal(result.offers[0].currency, 'VND');
    assert.equal(result.offers[0].stockStatus, 'inStock');
    assert.equal(result.offers[0].languageCode, 'vi');
});

test('offer deduplication removes tracking variants and respects the cap', () => {
    const base = { offerId: '1', providerName: 'Fahasa', productUrl: 'https://www.fahasa.com/one-piece.html', editionId: 'edition:1', price: 28500 };
    const duplicate = { ...base, offerId: '2', productUrl: `${base.productUrl}?utm_source=mail` };
    const second = { ...base, offerId: '3', productUrl: 'https://www.fahasa.com/one-piece-2.html', editionId: 'edition:2', price: 30000 };
    assert.equal(deduplicateOffers([base, duplicate, second], 1).length, 1);
    assert.equal(deduplicateOffers([base, duplicate, second], 2).length, 2);
});

test('snapshot offer summary keeps missing prices null instead of Infinity', () => {
    const snapshot = buildSnapshot({
        queryTitle: 'One Piece',
        work: { workId: 'kitsu:38', canonicalTitle: 'One Piece' },
        market: { countryCode: 'US', languageCode: 'en' },
        offers: [{ providerName: 'Fahasa', productUrl: 'https://www.fahasa.com/item.html', price: null, currency: 'VND', stockStatus: 'unknown' }],
    });
    assert.equal(snapshot.retailSummary.lowestPrice, null);
    assert.equal(snapshot.retailSummary.highestPrice, null);
});
