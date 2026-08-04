import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { normalizeInput } from '../src/google-play/normalize-input.js';

test('schema defaults form a valid runnable input without manual fields', async () => {
    const schema = JSON.parse(await readFile(new URL('../.actor/input_schema.json', import.meta.url), 'utf8'));
    const defaultInput = Object.fromEntries(
        Object.entries(schema.properties)
            .filter(([, property]) => Object.hasOwn(property, 'default'))
            .map(([name, property]) => [name, property.default]),
    );

    const normalized = normalizeInput(defaultInput);

    assert.deepEqual(normalized.appIds, ['com.todoist']);
    assert.equal(defaultInput.mode, 'reviews');
});
