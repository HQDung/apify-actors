import { appendFile, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { validateActorFiles } from './validate-actor-files.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const benchmarkFile = path.resolve(scriptDir, '..', 'BENCHMARKS.md');

const requirePath = async (value, label, directory) => {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);

    const absolutePath = path.resolve(value);
    const details = await stat(absolutePath).catch(() => null);
    if (!details || details.isDirectory() !== directory) {
        throw new Error(`${label} does not point to a ${directory ? 'directory' : 'file'}: ${absolutePath}`);
    }

    return absolutePath;
};

const readBenchmarkInput = async (nicheFile, benchmarkLabel) => {
    const niche = JSON.parse(await readFile(nicheFile, 'utf8'));
    const benchmark = niche?.benchmarkInputs?.find((entry) => entry?.label === benchmarkLabel);

    if (!benchmark) {
        throw new Error(`Benchmark input label not found: ${benchmarkLabel}`);
    }
    if (!benchmark.input || typeof benchmark.input !== 'object' || Array.isArray(benchmark.input)) {
        throw new Error(`Benchmark input must be an object: ${benchmarkLabel}`);
    }

    return structuredClone(benchmark.input);
};

const runApify = (actorDir, inputFile) => new Promise((resolve, reject) => {
    const child = spawn('apify', ['run', '--purge', '--input-file', inputFile], {
        cwd: actorDir,
        shell: false,
        stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
    });
    child.once('error', reject);
    child.once('close', (code, signal) => {
        if (code === 0) {
            resolve();
            return;
        }

        const detail = stderr.trim() ? `: ${stderr.trim().slice(-1000)}` : '';
        reject(new Error(`apify run failed with ${signal ? `signal ${signal}` : `exit code ${code}`}${detail}`));
    });
});

const readDatasetRows = async (actorDir) => {
    const datasetDir = path.join(actorDir, 'storage', 'datasets', 'default');
    const entries = await readdir(datasetDir, { withFileTypes: true }).catch((error) => {
        if (error.code === 'ENOENT') return [];
        throw error;
    });
    const rows = [];

    for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith('.json')).sort((a, b) => a.name.localeCompare(b.name))) {
        const parsed = JSON.parse(await readFile(path.join(datasetDir, entry.name), 'utf8'));
        rows.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    }

    return rows;
};

const hasValue = (value) => {
    if (Array.isArray(value)) return value.some(hasValue);
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== null && value !== undefined;
};

const summarizeRows = (rows) => ({
    rows: rows.length,
    itemsWithPhone: rows.filter((row) => hasValue(row?.phone)).length,
    itemsWithWebsite: rows.filter((row) => hasValue(row?.website)).length,
    itemsWithEmail: rows.filter((row) => hasValue(row?.email) || hasValue(row?.emails)).length,
});

const markdownCell = (value) => String(value).replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ');

const appendBenchmarkRow = async ({ actorDir, benchmarkLabel, runtimeMs, summary }) => {
    const row = [
        path.basename(actorDir),
        new Date().toISOString().slice(0, 10),
        benchmarkLabel,
        `${runtimeMs} ms`,
        'local-only / not available',
        `completed (${summary.rows} rows)`,
        summary.itemsWithPhone,
        summary.itemsWithWebsite,
        summary.itemsWithEmail,
        'Local-only run; cloud testing is separate.',
    ].map(markdownCell);
    const existing = await readFile(benchmarkFile, 'utf8').catch((error) => {
        if (error.code === 'ENOENT') return '';
        throw error;
    });
    const prefix = existing && !existing.endsWith('\n') ? '\n' : '';

    await appendFile(benchmarkFile, `${prefix}| ${row.join(' | ')} |\n`);
};

export async function runBenchmark({ actorDir, nicheFile, benchmarkLabel, dryRun = false }) {
    const absoluteActorDir = await requirePath(actorDir, 'actorDir', true);
    const absoluteNicheFile = await requirePath(nicheFile, 'nicheFile', false);
    if (typeof benchmarkLabel !== 'string' || !benchmarkLabel.trim()) {
        throw new Error('benchmarkLabel is required.');
    }

    const input = await readBenchmarkInput(absoluteNicheFile, benchmarkLabel);
    if (dryRun) {
        return { executed: false, input, actorDir: absoluteActorDir, benchmarkLabel };
    }

    const validation = await validateActorFiles(absoluteActorDir);
    if (!validation.valid) {
        throw new Error(`Actor validation failed:\n${validation.errors.map((error) => `- ${error}`).join('\n')}`);
    }

    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'actor-benchmark-'));
    const inputFile = path.join(tempDir, 'input.json');

    try {
        await writeFile(inputFile, `${JSON.stringify(input, null, 2)}\n`);
        const startedAt = performance.now();
        await runApify(absoluteActorDir, inputFile);
        const runtimeMs = Math.round(performance.now() - startedAt);
        const summary = summarizeRows(await readDatasetRows(absoluteActorDir));
        await appendBenchmarkRow({ actorDir: absoluteActorDir, benchmarkLabel, runtimeMs, summary });

        return {
            executed: true,
            input,
            actorDir: absoluteActorDir,
            benchmarkLabel,
            runtimeMs,
            ...summary,
            benchmarkFile,
        };
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

const parseArgs = (args) => {
    const options = { dryRun: false };
    for (let index = 0; index < args.length; index++) {
        const flag = args[index];
        if (flag === '--dry-run') {
            options.dryRun = true;
            continue;
        }
        if (!['--actor-dir', '--niche-file', '--label'].includes(flag)) {
            throw new Error(`Unknown flag: ${flag}`);
        }
        const value = args[++index];
        if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
        if (flag === '--actor-dir') options.actorDir = value;
        if (flag === '--niche-file') options.nicheFile = value;
        if (flag === '--label') options.benchmarkLabel = value;
    }

    return options;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const result = await runBenchmark(parseArgs(process.argv.slice(2)));
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
