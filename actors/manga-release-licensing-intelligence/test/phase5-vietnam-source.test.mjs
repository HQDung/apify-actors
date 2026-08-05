import test from 'node:test';
import assert from 'node:assert/strict';

import { collectKimDongSignals, isAllowedKimDongUrl } from '../src/sources/vn/kim-dong-adapter.js';

const categoryHtml = `
    <html><body>
      <a href="/one-piece-tap-110-ban-dac-biet">One Piece - Tập 110 - Bản đặc biệt</a>
    </body></html>`;

const productHtml = `
    <html><head><script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Product","name":"One Piece - Tập 110 - Bản đặc biệt","sku":"5262203332110","isbn":"978-604-2-39892-3","brand":{"name":"Kim Đồng"},"offers":{"price":"180000","priceCurrency":"VND","availability":"https://schema.org/InStock"}}
    </script></head><body><h1>One Piece - Tập 110 - Bản đặc biệt</h1><div>Giá bìa: 200.000₫</div><div>Còn hàng</div></body></html>`;

test('Kim Đồng allowlist accepts public catalog/product routes and rejects private routes', () => {
    assert.equal(isAllowedKimDongUrl('https://nxbkimdong.com.vn/one-piece'), true);
    assert.equal(isAllowedKimDongUrl('https://nxbkimdong.com.vn/one-piece-tap-110-ban-dac-biet'), true);
    assert.equal(isAllowedKimDongUrl('https://nxbkimdong.com.vn/cart'), false);
    assert.equal(isAllowedKimDongUrl('https://nxbkimdong.com.vn/search?q=one+piece'), false);
});

test('Kim Đồng adapter preserves Vietnamese labels and normalizes VND/stock/ISBN', async () => {
    const requested = [];
    const result = await collectKimDongSignals({
        work: { workId: 'kitsu:38', canonicalTitle: 'One Piece' },
        market: { countryCode: 'VN', languageCode: 'vi' },
        fetchImpl: async (url) => {
            requested.push(String(url));
            return new Response(String(url).endsWith('/one-piece') ? categoryHtml : productHtml, { status: 200 });
        },
        maxEditions: 3,
    });

    assert.equal(result.license.localPublisher, 'Kim Đồng');
    assert.equal(result.license.status, 'licenseSignalFound');
    assert.equal(result.officialAvailability.isAvailable, true);
    assert.equal(result.localizedRelease.latestVolumeNumber, 110);
    assert.equal(result.localizedRelease.latestVolumeLabel, 'One Piece - Tập 110 - Bản đặc biệt');
    assert.equal(result.editions[0].isbn13, '9786042398923');
    assert.equal(result.offers[0].price, 180000);
    assert.equal(result.offers[0].currency, 'VND');
    assert.equal(result.offers[0].stockStatus, 'inStock');
    assert.ok(requested.every((url) => isAllowedKimDongUrl(url)));
});

test('Kim Đồng source failure remains partial', async () => {
    const result = await collectKimDongSignals({
        work: { workId: 'kitsu:unknown', canonicalTitle: 'Unknown Title' },
        market: { countryCode: 'VN', languageCode: 'vi' },
        fetchImpl: async () => new Response('not found', { status: 404 }),
    });
    assert.equal(result.license.status, 'unknown');
    assert.equal(result.officialAvailability.isAvailable, null);
    assert.ok(result.warnings.some((warning) => warning.code === 'PUBLISHER_SOURCE_FAILED'));
});
