import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ignoredNames = new Set(['node_modules', '.git', 'generated-actor']);
const textExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.json', '.md', '.txt', '.yml', '.yaml', '.env']);
const requiredNicheFields = [
    'actorName',
    'actorTitle',
    'niche',
    'nichePlural',
    'defaultKeyword',
    'defaultLocation',
    'shortDescription',
    'longDescription',
];
const requiredMetadataFields = ['targetUser', 'buyerPainPoint', 'differentiation'];
const requiredBenchmarkLabels = ['smoke', 'email-baseline', 'broader-search'];
const actorNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const isTextFile = (filePath) => {
    const basename = path.basename(filePath).toLowerCase();

    return basename === 'dockerfile' || textExtensions.has(path.extname(filePath).toLowerCase());
};

const jsonStringContent = (value) => JSON.stringify(String(value)).slice(1, -1).replaceAll("'", '\\u0027');

const isPathInside = (childPath, parentPath) => {
    const relativePath = path.relative(parentPath, childPath);

    return relativePath === '' || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath));
};

const realpathOfExistingParent = async (targetPath) => {
    let candidate = path.dirname(targetPath);

    while (true) {
        try {
            if ((await fs.stat(candidate)).isDirectory()) return fs.realpath(candidate);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }

        const parent = path.dirname(candidate);
        if (parent === candidate) return fs.realpath(candidate);
        candidate = parent;
    }
};

const validateNiche = (niche) => {
    if (!niche || typeof niche !== 'object' || Array.isArray(niche)) {
        throw new Error('Niche config must be a JSON object.');
    }

    for (const field of requiredNicheFields) {
        if (typeof niche[field] !== 'string' || !niche[field].trim()) {
            throw new Error(`Niche config field "${field}" must be a non-empty string.`);
        }
    }

    if (niche.actorName.length > 63 || !actorNamePattern.test(niche.actorName)) {
        throw new Error('Niche config field "actorName" must use lowercase letters, numbers, and single hyphens only.');
    }

    for (const field of requiredMetadataFields) {
        if (typeof niche[field] !== 'string' || !niche[field].trim()) {
            throw new Error(`Niche config field "${field}" must be a non-empty string.`);
        }
    }

    if (!niche.sampleInput || typeof niche.sampleInput !== 'object' || Array.isArray(niche.sampleInput)) {
        throw new Error('Niche config field "sampleInput" must be an object.');
    }

    if (!Array.isArray(niche.benchmarkInputs)
        || requiredBenchmarkLabels.some((label) => !niche.benchmarkInputs.some((benchmark) => benchmark?.label === label))) {
        throw new Error(`Niche config field "benchmarkInputs" must include ${requiredBenchmarkLabels.join(', ')} labels.`);
    }

    if (niche.multiSearch !== undefined && niche.multiSearch !== null
        && (typeof niche.multiSearch !== 'object' || Array.isArray(niche.multiSearch))) {
        throw new Error('Niche config field "multiSearch" must be an object when provided.');
    }

    for (const field of ['locationInputField', 'locationOutputField', 'typeInputField', 'typeOutputField', 'maxResultsInputField']) {
        if (niche.multiSearch?.[field] !== undefined && !identifierPattern.test(niche.multiSearch[field])) {
            throw new Error(`Niche config multiSearch field "${field}" must be a JavaScript identifier.`);
        }
    }
};

export async function generateActor({ nicheKey, nicheFile, outputDir, rootDir = process.cwd() }) {
    const absoluteRootDir = path.resolve(rootDir);
    const templateDir = path.join(absoluteRootDir, 'templates', 'lead-scraper-template');
    const nichePath = nicheFile
        ? path.resolve(absoluteRootDir, nicheFile)
        : path.join(absoluteRootDir, 'niches', `${nicheKey}.json`);

    let realTemplateDir;
    try {
        realTemplateDir = await fs.realpath(templateDir);
    } catch {
        throw new Error(`Template folder not found: ${templateDir}`);
    }

    let niche;
    try {
        niche = JSON.parse(await fs.readFile(nichePath, 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT') throw new Error(`Niche config not found: ${nichePath}`);
        throw error;
    }
    validateNiche(niche);

    const actorDir = path.resolve(outputDir ?? path.join(absoluteRootDir, 'actors', niche.actorName));
    if (isPathInside(actorDir, templateDir)) {
        throw new Error(`Output directory cannot be inside the template folder: ${actorDir}`);
    }
    if (isPathInside(await realpathOfExistingParent(actorDir), realTemplateDir)) {
        throw new Error(`Output directory cannot be inside the template folder: ${actorDir}`);
    }
    try {
        await fs.access(actorDir);
        throw new Error(`Actor already exists: ${actorDir}`);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    const multiSearch = niche.multiSearch ?? null;
    const replacements = {
        '{{ACTOR_NAME}}': jsonStringContent(niche.actorName),
        '{{ACTOR_TITLE}}': jsonStringContent(niche.actorTitle),
        '{{NICHE}}': jsonStringContent(niche.niche),
        '{{NICHE_PLURAL}}': jsonStringContent(niche.nichePlural),
        '{{DEFAULT_KEYWORD}}': jsonStringContent(niche.defaultKeyword),
        '{{DEFAULT_LOCATION}}': jsonStringContent(niche.defaultLocation),
        '{{SHORT_DESCRIPTION}}': jsonStringContent(niche.shortDescription),
        '{{LONG_DESCRIPTION}}': jsonStringContent(niche.longDescription),
        '{{TARGET_USER}}': niche.targetUser,
        '{{BUYER_PAIN_POINT}}': niche.buyerPainPoint,
        '{{DIFFERENTIATION}}': niche.differentiation,
        '{{BENCHMARKS_NOTE}}': 'Benchmark inputs and results are tracked in the repository [BENCHMARKS.md](../../BENCHMARKS.md).',
        '{{SAMPLE_INPUT_JSON}}': JSON.stringify(niche.sampleInput, null, 2),
        '{{BENCHMARK_INPUTS_JSON}}': JSON.stringify(niche.benchmarkInputs, null, 2),
        '{{MULTI_SEARCH_CONFIG_JSON}}': JSON.stringify(multiSearch),
        '{{SEARCH_LOCATION_INPUT_FIELD}}': jsonStringContent(multiSearch?.locationInputField ?? 'location'),
        '{{SEARCH_LOCATION_OUTPUT_FIELD}}': jsonStringContent(multiSearch?.locationOutputField ?? 'location'),
        '{{SEARCH_TYPE_INPUT_FIELD}}': jsonStringContent(multiSearch?.typeInputField ?? 'keyword'),
        '{{SEARCH_TYPE_OUTPUT_FIELD}}': jsonStringContent(multiSearch?.typeOutputField ?? 'keyword'),
        '{{MAX_RESULTS_INPUT_FIELD}}': jsonStringContent(multiSearch?.maxResultsInputField ?? 'maxResults'),
        '{{SEARCH_TYPE_INPUT_TITLE}}': jsonStringContent(multiSearch?.typeInputTitle ?? 'Keyword'),
        '{{SEARCH_TYPE_INPUT_DESCRIPTION}}': jsonStringContent(multiSearch?.typeInputDescription ?? `Search keyword for ${niche.nichePlural}.`),
        '{{SEARCH_LOCATION_INPUT_TITLE}}': jsonStringContent(multiSearch?.locationInputTitle ?? 'Location'),
        '{{SEARCH_LOCATION_INPUT_DESCRIPTION}}': jsonStringContent(multiSearch?.locationInputDescription ?? 'Target city or area.'),
        '{{MAX_RESULTS_INPUT_TITLE}}': jsonStringContent(multiSearch?.maxResultsInputTitle ?? 'Max results'),
        '{{MAX_RESULTS_INPUT_DESCRIPTION}}': jsonStringContent(multiSearch?.maxResultsInputDescription ?? 'Maximum number of Google Maps results to scrape.'),
        '{{SEARCH_TYPE_OUTPUT_LABEL}}': jsonStringContent(multiSearch?.typeOutputLabel ?? 'Keyword'),
        '{{SEARCH_LOCATION_OUTPUT_LABEL}}': jsonStringContent(multiSearch?.locationOutputLabel ?? 'Location'),
        '{{SEARCH_TYPE_DOC_LABEL}}': jsonStringContent(multiSearch?.typeDocLabel ?? 'keyword'),
        '{{SEARCH_LOCATION_DOC_LABEL}}': jsonStringContent(multiSearch?.locationDocLabel ?? 'location'),
        '{{DEFAULT_SEARCH_TYPES_JSON}}': JSON.stringify(multiSearch?.defaultTypes ?? [niche.defaultKeyword]),
        '{{PREFILL_SEARCH_TYPES_JSON}}': JSON.stringify(multiSearch?.prefillTypes ?? [niche.defaultKeyword]),
        '{{SEARCH_QUERY_TEMPLATE_JSON}}': JSON.stringify(multiSearch?.searchQueryTemplate ?? '{type} {location}'),
        '{{SEARCH_QUERY_EXAMPLE}}': jsonStringContent(multiSearch?.searchQueryExample ?? `${niche.defaultKeyword} ${niche.defaultLocation}`),
    };

    const replacePlaceholders = (text) => {
        const conditionallyRendered = Object.entries({ MULTI_SEARCH: Boolean(multiSearch) }).reduce((updated, [name, enabled]) => {
            const positivePattern = new RegExp(`{{#${name}}}([\\s\\S]*?){{/${name}}}`, 'g');
            const negativePattern = new RegExp(`{{\\^${name}}}([\\s\\S]*?){{/${name}}}`, 'g');

            return updated.replace(positivePattern, enabled ? '$1' : '').replace(negativePattern, enabled ? '' : '$1');
        }, text);

        return Object.entries(replacements).reduce(
            (updated, [placeholder, value]) => updated.split(placeholder).join(String(value)),
            conditionallyRendered,
        );
    };

    const copyRecursive = async (source, target) => {
        const stat = await fs.stat(source);

        if (stat.isDirectory()) {
            await fs.mkdir(target, { recursive: true });
            const entries = await fs.readdir(source);

            await Promise.all(entries
                .filter((entry) => !ignoredNames.has(entry))
                .map((entry) => copyRecursive(path.join(source, entry), path.join(target, entry))));
            return;
        }

        if (isTextFile(source)) {
            await fs.writeFile(target, replacePlaceholders(await fs.readFile(source, 'utf8')));
            return;
        }

        await fs.copyFile(source, target);
    };

    await copyRecursive(templateDir, actorDir);

    return actorDir;
}

const printUsage = () => {
    console.error('Usage: node scripts/generate-actor.js <niche> [--niche-file <path>] [--output-dir <path>]');
    console.error('Example: node scripts/generate-actor.js hotel');
};

const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

const parseCliArgs = (args) => {
    const [nicheKey, ...flags] = args;
    if (!nicheKey || nicheKey.startsWith('--')) throw new Error('A niche name is required.');

    const options = { nicheKey };
    for (let index = 0; index < flags.length; index++) {
        const flag = flags[index];
        if (flag !== '--niche-file' && flag !== '--output-dir') throw new Error(`Unknown flag: ${flag}`);

        const value = flags[++index];
        if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
        if (flag === '--niche-file') options.nicheFile = value;
        else options.outputDir = value;
    }

    return options;
};

async function main() {
    let options;
    try {
        options = parseCliArgs(process.argv.slice(2));
    } catch (error) {
        console.error(error.message);
        printUsage();
        process.exitCode = 1;
        return;
    }

    const nichePath = options.nicheFile
        ? path.resolve(process.cwd(), options.nicheFile)
        : path.join(process.cwd(), 'niches', `${options.nicheKey}.json`);
    const actorDir = await generateActor(options);
    const niche = JSON.parse(await fs.readFile(nichePath, 'utf8'));

    console.log(`Created Actor: ${niche.actorTitle}`);
    console.log(`Path: ${actorDir}`);
    console.log('');
    console.log('Next commands:');
    console.log(`cd ${options.outputDir ? shellQuote(actorDir) : path.relative(process.cwd(), actorDir)}`);
    console.log('npm install');
    console.log('apify run');
    console.log('apify push');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
