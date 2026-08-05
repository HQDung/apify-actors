import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('publish-readiness commands are defined and default input remains safe', async () => {
    const packageJson = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
    const input = JSON.parse(await fs.readFile(new URL('../samples/input.default.json', import.meta.url), 'utf8'));
    assert.equal(typeof packageJson.scripts.lint, 'string');
    assert.equal(typeof packageJson.scripts.typecheck, 'string');
    assert.equal(typeof packageJson.scripts.build, 'string');
    assert.equal(input.includeRetailOffers, false);
    assert.equal(input.detectChanges, false);
    assert.equal(input.proxyConfiguration.useApifyProxy, false);
});
