import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { generateActor } from '../scripts/generate-actor.js';
import { runBenchmark } from '../scripts/run-local-benchmark.js';
import { validateActorFiles } from '../scripts/validate-actor-files.js';

const execFileAsync = promisify(execFile);

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
    await assert.rejects(readFile(path.join(actorDir, 'generated-actor')), { code: 'ENOENT' });
    assert.equal((await validateActorFiles(actorDir)).valid, true);
});

test('wires the generated dataset schema through actor metadata', async (t) => {
    const outputDir = await createOutputDir(t);
    const actorDir = await generateActor({ nicheKey: 'spa', outputDir });
    const actor = JSON.parse(await readFile(path.join(actorDir, '.actor', 'actor.json'), 'utf8'));

    assert.deepEqual(actor.storages, {
        dataset: './dataset_schema.json',
    });
});

test('renders the coworking-space niche with its standard lead inputs', async (t) => {
    const outputDir = await createOutputDir(t);
    const actorDir = await generateActor({ nicheKey: 'coworking-space', outputDir });
    const sampleInput = JSON.parse(await readFile(
        path.join(actorDir, 'storage', 'key_value_stores', 'default', 'INPUT.json'),
        'utf8',
    ));

    assert.deepEqual(sampleInput, {
        keyword: 'coworking space',
        location: 'Ho Chi Minh',
        maxResults: 20,
        batchSize: 5,
        extractEmails: true,
        useApifyProxy: false,
    });
});

test('renders the spa sample input into local storage', async (t) => {
    const outputDir = await createOutputDir(t);
    const actorDir = await generateActor({ nicheKey: 'spa', outputDir });
    const sampleInput = JSON.parse(await readFile(
        path.join(actorDir, 'storage', 'key_value_stores', 'default', 'INPUT.json'),
        'utf8',
    ));

    assert.deepEqual(sampleInput, {
        keyword: 'spa',
        location: 'Ho Chi Minh',
        maxResults: 20,
        batchSize: 5,
        extractEmails: true,
        useApifyProxy: false,
    });
});

test('renders the repository benchmark tracking link for spa and hotel', async (t) => {
    for (const nicheKey of ['spa', 'hotel']) {
        const actorDir = await generateActor({ nicheKey, outputDir: await createOutputDir(t) });
        const readme = await readFile(path.join(actorDir, 'README.md'), 'utf8');

        assert.match(
            readme,
            /Benchmark inputs and results are tracked in the repository \[BENCHMARKS\.md\]\(\.\.\/\.\.\/BENCHMARKS\.md\)\./,
        );
    }
});

test('returns the selected benchmark input without side effects in dry-run mode', async () => {
    const result = await runBenchmark({
        actorDir: path.join(process.cwd(), 'actors', 'vietnam-spa-lead-scraper'),
        nicheFile: path.join(process.cwd(), 'niches', 'spa.json'),
        benchmarkLabel: 'smoke',
        dryRun: true,
    });

    assert.equal(result.executed, false);
    assert.equal(result.benchmarkLabel, 'smoke');
    assert.deepEqual(result.input, {
        keyword: 'spa',
        location: 'Ho Chi Minh',
        maxResults: 1,
        batchSize: 1,
        extractEmails: false,
        useApifyProxy: false,
    });
});

test('blocks normal benchmarks when actor validation fails before invoking apify', async (t) => {
    const actorDir = await createOutputDir(t);
    await generateActor({ nicheKey: 'hotel', outputDir: actorDir });
    await writeFile(path.join(actorDir, 'README.md'), '# {{ACTOR_NAME}}\n');

    const tempBin = await mkdtemp(path.join(os.tmpdir(), 'actor-benchmark-bin-'));
    const markerFile = path.join(tempBin, 'apify-invoked');
    const fakeApify = path.join(tempBin, 'apify');
    await writeFile(fakeApify, `#!/bin/sh\nprintf invoked > '${markerFile}'\nexit 1\n`);
    await chmod(fakeApify, 0o755);
    const previousPath = process.env.PATH;
    process.env.PATH = `${tempBin}${path.delimiter}${previousPath ?? ''}`;
    t.after(async () => {
        process.env.PATH = previousPath;
        await rm(tempBin, { recursive: true, force: true });
    });

    await assert.rejects(
        runBenchmark({
            actorDir,
            nicheFile: path.join(process.cwd(), 'niches', 'hotel.json'),
            benchmarkLabel: 'smoke',
        }),
        /Actor validation failed:[\s\S]*README\.md/,
    );
    await assert.rejects(readFile(markerFile), { code: 'ENOENT' });
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

test('rejects output whose existing parent resolves inside the template', async (t) => {
    const tempParent = await mkdtemp(path.join(os.tmpdir(), 'actor-template-link-'));
    const linkedTemplate = path.join(tempParent, 'template-link');
    await symlink(path.join(process.cwd(), 'templates', 'lead-scraper-template'), linkedTemplate, 'dir');
    t.after(() => rm(tempParent, { recursive: true, force: true }));

    await assert.rejects(
        generateActor({ nicheKey: 'hotel', outputDir: path.join(linkedTemplate, 'generated-actor') }),
        /inside the template folder/,
    );
});

test('prints the actual custom output directory in the CLI next command', async (t) => {
    const tempParent = await mkdtemp(path.join(os.tmpdir(), 'actor-cli-output-'));
    const outputDir = path.join(tempParent, 'custom-actor');
    t.after(() => rm(tempParent, { recursive: true, force: true }));

    const { stdout } = await execFileAsync(process.execPath, [
        'scripts/generate-actor.js',
        'hotel',
        '--output-dir',
        outputDir,
    ], { cwd: process.cwd() });

    assert.match(stdout, new RegExp(`cd '?${outputDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'?`));
    assert.doesNotMatch(stdout, /cd actors\/vietnam-hotel-lead-scraper/);
});

test('keeps Crawlee Playwright tooling in template devDependencies', async () => {
    const packageJson = JSON.parse(await readFile(
        path.join(process.cwd(), 'templates', 'lead-scraper-template', 'package.json'),
        'utf8',
    ));

    assert.equal(packageJson.dependencies?.['@crawlee/playwright'], undefined);
    assert.equal(packageJson.devDependencies?.['@crawlee/playwright'], '^3.15.3');
});
