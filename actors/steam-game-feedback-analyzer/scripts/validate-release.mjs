import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requiredFiles = [
  "README.md",
  "BENCHMARK_NOTES.md",
  "CHANGELOG.md",
  "sample-input.json",
  "package-lock.json",
  "Dockerfile",
  "storage/key_value_stores/default/INPUT.json",
  ".actor/actor.json",
  ".actor/input_schema.json",
  ".actor/output_schema.json",
  ".actor/dataset_schema.json",
];

const requiredHeadings = [
  "## What this Actor does",
  "## Who it is for",
  "## Key features",
  "## Supported input",
  "## Modes",
  "## Output",
  "## Output fields",
  "## Feedback taxonomy",
  "## Aggregated reports",
  "## Language support",
  "## Cost considerations",
  "## Limitations",
  "## Compliance and responsible use",
  "## Benchmark results",
  "## FAQ",
  "## Roadmap",
];

const asPath = (value) => (value instanceof URL ? fileURLToPath(value) : path.resolve(value));
const readRequired = async (root, relativePath, errors) => {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch {
    errors.push(`Missing required release file: ${relativePath}`);
    return null;
  }
};

export const validateRelease = async (actorRoot) => {
  const root = asPath(actorRoot);
  const errors = [];
  const contents = new Map();
  for (const relativePath of requiredFiles) {
    const content = await readRequired(root, relativePath, errors);
    if (content !== null) contents.set(relativePath, content);
  }

  const parsed = new Map();
  for (const relativePath of [".actor/actor.json", ".actor/input_schema.json", ".actor/output_schema.json", ".actor/dataset_schema.json", "sample-input.json", "storage/key_value_stores/default/INPUT.json"]) {
    const content = contents.get(relativePath);
    if (!content) continue;
    try {
      parsed.set(relativePath, JSON.parse(content));
    } catch (error) {
      errors.push(`Invalid JSON in ${relativePath}: ${error.message}`);
    }
  }

  const actor = parsed.get(".actor/actor.json");
  if (actor?.meta?.generatedBy !== "Codex with GPT-5") errors.push(".actor/actor.json must identify Codex with GPT-5 in meta.generatedBy.");
  const input = parsed.get("sample-input.json");
  if (!input?.steamAppIds?.length && !input?.startUrls?.length) errors.push("sample-input.json must include a Steam app ID or URL.");
  const datasetFields = parsed.get(".actor/dataset_schema.json")?.views?.overview?.transformation?.fields ?? [];
  const readme = contents.get("README.md") ?? "";
  for (const heading of requiredHeadings) if (!readme.includes(heading)) errors.push(`README.md is missing ${heading}.`);
  for (const field of datasetFields) if (!readme.includes(`| \`${field}\` |`)) errors.push(`README.md does not document dataset field ${field}.`);

  for (const [relativePath, content] of contents) {
    if (/{{[#^/]?[A-Z][A-Z0-9_]*}}/.test(content)) errors.push(`Unresolved generator marker in ${relativePath}.`);
  }
  return { valid: errors.length === 0, errors };
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await validateRelease(process.argv[2] ?? ".");
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.valid) process.exitCode = 1;
}
