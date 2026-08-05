import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await fs.readFile(new URL(path, import.meta.url), 'utf8'));

test('Console schemas expose runnable defaults, views, and output links', async () => {
    const input = await readJson('../.actor/input_schema.json');
    const dataset = await readJson('../.actor/dataset_schema.json');
    const output = await readJson('../.actor/output_schema.json');

    assert.equal(input.properties.mode.default, 'titleLookup');
    assert.deepEqual(input.properties.markets.default, [{ countryCode: 'US', languageCode: 'en' }]);
    assert.equal(input.properties.includeRetailOffers.default, false);
    assert.ok(dataset.views.overview);
    assert.ok(dataset.views.licensing);
    assert.ok(dataset.views.availability);
    assert.ok(dataset.views.provenance);
    for (const property of Object.values(output.properties)) {
        assert.equal(property.type, 'string');
        assert.ok(property.title);
        assert.match(property.template, /^\{\{links\./);
    }
});

test('default output sample is a valid flattened title-market snapshot', async () => {
    const output = await readJson('../samples/output.default.json');
    assert.equal(output.actorOutputSchemaVersion, 1);
    assert.equal(output.recordType, 'titleMarketSnapshot');
    assert.equal(output.match.status, 'matched');
    assert.ok(output.canonicalTitle);
    assert.match(output.marketCode, /^[A-Z]{2}-[a-z]{2}$/);
    assert.ok(Object.hasOwn(output, 'latestLocalizedVolume'));
    assert.ok(Object.hasOwn(output, 'offersCollected'));
});
