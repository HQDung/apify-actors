import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const actorDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const matrixFile = path.join(actorDir, "validation/global-matrix-inputs.json");

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? actorDir,
      env: { ...process.env, ...(options.env ?? {}) },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = options.timeoutMs
      ? setTimeout(() => child.kill("SIGTERM"), options.timeoutMs)
      : null;
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      if (timeout) clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code, signal) => {
      if (timeout) clearTimeout(timeout);
      resolve({ code, signal, stdout, stderr });
    });
  });

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

const readLocalDataset = async (storageDir) => {
  const datasetDir = path.join(storageDir, "datasets/default");
  const entries = await readdir(datasetDir, { withFileTypes: true }).catch(
    (error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );
  const rows = [];
  for (const entry of entries
    .filter((item) => item.isFile() && item.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const parsed = await readJson(path.join(datasetDir, entry.name));
    rows.push(...(Array.isArray(parsed) ? parsed : [parsed]));
  }
  return rows;
};

const readLocalSummary = async (storageDir) => {
  const file = path.join(storageDir, "key_value_stores/default/OUTPUT.json");
  return readJson(file).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
};

const parseStructuredOutput = (output) => {
  const candidates = [];
  for (const marker of ["\n{", "\n[", "{", "["]) {
    let index = output.lastIndexOf(marker);
    while (index >= 0) {
      candidates.push(index + marker.length - 1);
      const previousIndex = output.lastIndexOf(marker, index - 1);
      if (previousIndex === index) break;
      index = previousIndex;
    }
  }
  for (const index of [...new Set(candidates)].sort(
    (left, right) => right - left,
  )) {
    try {
      return JSON.parse(output.slice(index).trim());
    } catch {
      // Ignore human-readable CLI lines and embedded log JSON.
    }
  }
  throw new Error("Apify CLI returned no parseable JSON payload.");
};

const hasValue = (value) => {
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
};

const qualityFor = (rows) => {
  const domains = rows.map((row) => row?.domain).filter(Boolean);
  return {
    rows: rows.length,
    firmNames: rows.filter((row) => hasValue(row?.firmName)).length,
    profileUrls: rows.filter((row) =>
      /^https?:\/\//iu.test(row?.sourceRecords?.[0]?.profileUrl ?? ""),
    ).length,
    validDomains: rows.filter((row) => hasValue(row?.domain)).length,
    duplicateDomains: domains.length - new Set(domains).size,
    averageCompleteness:
      rows.length > 0
        ? Math.round(
            rows.reduce(
              (total, row) => total + (Number(row?.completenessScore) || 0),
              0,
            ) / rows.length,
          )
        : null,
  };
};

const resultClassFor = (rows, summary) => {
  if (rows.length > 0) return "usable_results";
  if (!summary) return "unclassified_zero_results";
  const failures = Object.values(summary.sourceFailures ?? {}).reduce(
    (total, value) => total + (Number(value) || 0),
    0,
  );
  if (failures > 0) return "source_failure";
  if (summary.directoryItemsFound === 0) return "no_public_results";
  return "profile_failures";
};

const inputFor = (defaults, testCase) => ({
  ...defaults,
  ...testCase,
  id: undefined,
});

const runCase = async (mode, defaults, testCase) => {
  const input = inputFor(defaults, testCase);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "xero-qb-matrix-"));
  const inputFile = path.join(tempDir, "input.json");
  await writeFile(inputFile, `${JSON.stringify(input, null, 2)}\n`);
  const startedAt = performance.now();
  let result;
  try {
    if (mode === "local") {
      const storageDir = path.join(actorDir, "storage");
      result = await runCommand(
        "apify",
        ["run", "--purge", "--input-file", inputFile],
        {
          timeoutMs: 180_000,
        },
      );
      const rows = await readLocalDataset(storageDir);
      const summary = await readLocalSummary(storageDir);
      return {
        id: testCase.id,
        mode,
        input,
        runtimeMs: Math.round(performance.now() - startedAt),
        exitCode: result.code,
        error: result.code === 0 ? null : result.stderr.trim().slice(-1000),
        summary,
        resultClass: resultClassFor(rows, summary),
        quality: qualityFor(rows),
      };
    }
    result = await runCommand(
      "apify",
      [
        "call",
        "xero-quickbooks-accounting-firm-leads",
        "--input-file",
        inputFile,
        "--json",
        "--timeout",
        "600",
      ],
      { timeoutMs: 660_000 },
    );
    if (result.code !== 0) {
      return {
        id: testCase.id,
        mode,
        input,
        runtimeMs: Math.round(performance.now() - startedAt),
        exitCode: result.code,
        error: (result.stderr || result.stdout).trim().slice(-1000),
        run: null,
        summary: null,
        resultClass: "source_failure",
        quality: qualityFor([]),
      };
    }
    const call = parseStructuredOutput(result.stdout);
    const runId =
      call.run?.id ?? result.stdout.match(/\/runs\/([A-Za-z0-9]+)/u)?.[1];
    if (!runId)
      throw new Error(`Cloud call returned no run ID: ${testCase.id}`);
    const runInfoResult = await runCommand(
      "apify",
      ["runs", "info", runId, "--json"],
      { timeoutMs: 30_000 },
    );
    const runInfo = parseStructuredOutput(runInfoResult.stdout);
    const datasetId =
      runInfo.defaultDatasetId ?? runInfo.storageIds?.datasets?.default;
    const keyValueStoreId =
      runInfo.defaultKeyValueStoreId ??
      runInfo.storageIds?.keyValueStores?.default;
    const datasetResult = await runCommand(
      "apify",
      ["datasets", "get-items", datasetId],
      { timeoutMs: 30_000 },
    );
    const rows = parseStructuredOutput(datasetResult.stdout);
    const summaryResult = await runCommand(
      "apify",
      ["key-value-stores", "get-value", keyValueStoreId, "OUTPUT"],
      { timeoutMs: 30_000 },
    );
    const summary = parseStructuredOutput(summaryResult.stdout);
    return {
      id: testCase.id,
      mode,
      input,
      runtimeMs: Math.round(performance.now() - startedAt),
      exitCode: result.code,
      error: null,
      run: {
        id: runInfo.id,
        status: runInfo.status,
        buildNumber: runInfo.buildNumber,
        usageTotalUsd: runInfo.usageTotalUsd,
        durationMillis: runInfo.stats?.durationMillis,
        consoleUrl: runInfo.consoleUrl,
        datasetId,
      },
      summary,
      resultClass: resultClassFor(rows, summary),
      quality: qualityFor(rows),
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
};

const parseArgs = (args) => {
  const options = { mode: "local" };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--mode") {
      options.mode = args[++index];
      continue;
    }
    if (flag !== "--case") throw new Error(`Unknown flag: ${flag}`);
    options.caseId = args[++index];
  }
  if (!["local", "cloud"].includes(options.mode))
    throw new Error("--mode must be local or cloud.");
  return options;
};

const { mode, caseId } = parseArgs(process.argv.slice(2));
const matrix = await readJson(matrixFile);
const cases = caseId
  ? matrix.cases.filter((testCase) => testCase.id === caseId)
  : matrix.cases;
if (!cases.length) throw new Error(`Matrix case not found: ${caseId}`);

const results = [];
for (const testCase of cases) {
  results.push(await runCase(mode, matrix.defaults, testCase));
}
process.stdout.write(
  `${JSON.stringify({ mode, actorDir, results }, null, 2)}\n`,
);
