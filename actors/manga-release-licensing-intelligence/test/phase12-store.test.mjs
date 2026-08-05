import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('Store README covers the required product, usage, limitation, and roadmap sections', async () => {
    const readme = await fs.readFile(new URL('../README.md', import.meta.url), 'utf8');
    for (const heading of [
        'What this Actor does',
        'Who it is for',
        'Supported markets',
        'Supported sources',
        'Title lookup',
        'Publisher calendar',
        'Availability monitoring',
        'Input examples',
        'Output example',
        'Licensing statuses',
        'Edition matching',
        'Release-gap calculation',
        'Change detection',
        'Price and stock handling',
        'Dataset views',
        'Cost and runtime',
        'Known limitations',
        'Responsible use',
        'FAQ',
        'Roadmap',
    ]) {
        assert.match(readme, new RegExp(`## ${heading}`));
    }
    for (const keyword of ['manga data', 'manga licensing', 'manga price tracker', 'Vietnamese manga releases']) {
        assert.match(readme, new RegExp(keyword));
    }
    assert.match(readme, /does not download manga chapters or pages/i);
    assert.match(readme, /notFound.*does not prove.*unlicensed/is);
});

test('Store metadata keeps the recommended E-commerce and Other categories', async () => {
    const actor = JSON.parse(await fs.readFile(new URL('../.actor/actor.json', import.meta.url), 'utf8'));
    assert.ok(actor.categories.includes('E-COMMERCE'));
    assert.ok(actor.categories.includes('OTHER'));
});
