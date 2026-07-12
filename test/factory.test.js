import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { generateActor } from '../scripts/generate-actor.js';
import { validateActorFiles } from '../scripts/validate-actor-files.js';

const createOutputDir = async (t) => {
    const tempParent = await mkdtemp(path.join(os.tmpdir(), 'actor-factory-'));
    t.after(() => rm(tempParent, { recursive: true, force: true }));

    return path.join(tempParent, 'actor');
};

test('generates a self-contained hotel niche config that passes static validation', async (t) => {
    const outputDir = await createOutputDir(t);
    const actorDir = await generateActor({ nicheKey: 'hotel', outputDir });
    const nicheConfig = await readFile(path.join(actorDir, 'src', 'niche-config.js'), 'utf8');

    assert.match(nicheConfig, /hotelTypes/);
    assert.equal((await validateActorFiles(actorDir)).valid, true);
});

test('reports unresolved placeholders in generated files', async (t) => {
    const outputDir = await createOutputDir(t);
    const actorDir = await generateActor({ nicheKey: 'hotel', outputDir });

    await writeFile(path.join(actorDir, 'README.md'), '# {{ACTOR_NAME}}\n');

    const result = await validateActorFiles(actorDir);

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes('{{ACTOR_NAME}}')));
});

test('reports malformed generated sample input', async (t) => {
    const outputDir = await createOutputDir(t);
    const actorDir = await generateActor({ nicheKey: 'hotel', outputDir });

    await writeFile(path.join(actorDir, 'storage', 'key_value_stores', 'default', 'INPUT.json'), '{');

    const result = await validateActorFiles(actorDir);

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.startsWith('Invalid JSON in storage/key_value_stores/default/INPUT.json:')));
});

test('reports unresolved markers in generated source files', async (t) => {
    const outputDir = await createOutputDir(t);
    const actorDir = await generateActor({ nicheKey: 'hotel', outputDir });

    await writeFile(path.join(actorDir, 'src', 'generated-helper.js'), 'export default {{ACTOR_NAME}};\n');

    const result = await validateActorFiles(actorDir);

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes('src/generated-helper.js')));
});

test('rejects invalid niche actor names before rendering', async (t) => {
    const outputDir = await createOutputDir(t);
    const nicheFile = path.join(path.dirname(outputDir), 'invalid-niche.json');

    await writeFile(nicheFile, JSON.stringify({
        actorName: '../outside',
        actorTitle: 'Invalid Actor',
        niche: 'invalid',
        nichePlural: 'invalids',
        defaultKeyword: 'invalid',
        defaultLocation: 'Da Nang',
        shortDescription: 'Invalid actor.',
        longDescription: 'Invalid actor.',
    }));

    await assert.rejects(
        generateActor({ nicheKey: 'invalid', nicheFile, outputDir }),
        /actorName/,
    );
});

test('rejects output directories inside the template', async () => {
    await assert.rejects(
        generateActor({
            nicheKey: 'hotel',
            outputDir: path.join(process.cwd(), 'templates', 'lead-scraper-template', 'generated-actor'),
        }),
        /inside the template folder/,
    );
});
