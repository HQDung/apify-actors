import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredFiles = [
    'README.md',
    'src/main.js',
    'src/niche-config.js',
    'storage/key_value_stores/default/INPUT.json',
];
const schemaFiles = ['.actor/actor.json', '.actor/input_schema.json', '.actor/output_schema.json', '.actor/dataset_schema.json'];
const inputFile = 'storage/key_value_stores/default/INPUT.json';
const ignoredDirectoryNames = new Set(['node_modules', '.git', 'storage']);
const textExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.json', '.md', '.txt', '.yml', '.yaml', '.env']);
const markerPattern = /{{[#^/]?[A-Z][A-Z0-9_]*}}/g;

const isTextFile = (filePath) => path.basename(filePath).toLowerCase() === 'dockerfile'
    || textExtensions.has(path.extname(filePath).toLowerCase());

const collectTextFiles = async (actorDir, relativeDir = '') => {
    const entries = await fs.readdir(path.join(actorDir, relativeDir), { withFileTypes: true });
    const textFiles = [];

    for (const entry of entries) {
        const relativePath = path.join(relativeDir, entry.name);
        if (entry.isDirectory()) {
            if (!ignoredDirectoryNames.has(entry.name)) textFiles.push(...await collectTextFiles(actorDir, relativePath));
        } else if (entry.isFile() && isTextFile(relativePath)) {
            textFiles.push(relativePath);
        }
    }

    return textFiles;
};

const readFileOrError = async (actorDir, relativePath, errors) => {
    try {
        return await fs.readFile(path.join(actorDir, relativePath), 'utf8');
    } catch (error) {
        if (error.code === 'ENOENT') errors.push(`Missing required file: ${relativePath}`);
        else errors.push(`Cannot read ${relativePath}: ${error.message}`);
        return null;
    }
};

export async function validateActorFiles(actorDir) {
    const absoluteActorDir = path.resolve(actorDir);
    const errors = [];
    const warnings = [];
    const fileContents = new Map();

    for (const relativePath of [...requiredFiles, ...schemaFiles]) {
        const content = await readFileOrError(absoluteActorDir, relativePath, errors);
        if (content !== null) fileContents.set(relativePath, content);
    }

    const parsedJson = new Map();
    for (const relativePath of [...schemaFiles, inputFile]) {
        const content = fileContents.get(relativePath);
        if (!content) continue;

        try {
            parsedJson.set(relativePath, JSON.parse(content));
        } catch (error) {
            errors.push(`Invalid JSON in ${relativePath}: ${error.message}`);
        }
    }

    for (const relativePath of await collectTextFiles(absoluteActorDir)) {
        if (!fileContents.has(relativePath)) {
            fileContents.set(relativePath, await fs.readFile(path.join(absoluteActorDir, relativePath), 'utf8'));
        }
    }

    for (const [relativePath, content] of fileContents) {
        const markers = [...content.matchAll(markerPattern)].map(([marker]) => marker);
        for (const marker of new Set(markers)) errors.push(`Unresolved generator marker ${marker} in ${relativePath}`);
    }

    const datasetFields = parsedJson.get('.actor/dataset_schema.json')?.views?.overview?.transformation?.fields;
    const readme = fileContents.get('README.md');
    if (Array.isArray(datasetFields) && readme) {
        const outputFieldsStart = readme.search(/^## Output fields\s*$/m);
        const outputFieldsRemainder = outputFieldsStart >= 0 ? readme.slice(outputFieldsStart) : '';
        const nextHeading = outputFieldsRemainder.search(/\n## /);
        const outputFieldsSection = nextHeading >= 0
            ? outputFieldsRemainder.slice(0, nextHeading)
            : outputFieldsRemainder;
        const documentedFields = new Set([...outputFieldsSection.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map(([, field]) => field));

        for (const field of datasetFields) {
            if (documentedFields.has(field)) continue;
            if (field === 'error') warnings.push('Optional output field is not documented in README: error');
            else errors.push(`Dataset field is not documented in README output table: ${field}`);
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

async function main() {
    const actorDir = process.argv[2];
    if (!actorDir) {
        console.error('Usage: node scripts/validate-actor-files.js <actor-dir>');
        process.exitCode = 1;
        return;
    }

    const result = await validateActorFiles(actorDir);
    for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
    for (const error of result.errors) console.error(`Error: ${error}`);
    if (!result.valid) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
