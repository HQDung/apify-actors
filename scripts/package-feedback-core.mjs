import { mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repositoryRoot, "packages", "feedback-analysis-core");

export const coreArtifactName = (version) => `project-feedback-analysis-core-${version}.tgz`;

export const packageCoreForActor = async ({ actorDir, destination = "vendor" }) => {
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  const destinationDir = path.resolve(actorDir, destination);
  await mkdir(destinationDir, { recursive: true });
  await execFileAsync("npm", ["pack", packageRoot, "--pack-destination", destinationDir], {
    cwd: repositoryRoot,
    env: { ...process.env, NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE ?? path.join(os.tmpdir(), "feedback-analysis-core-npm-cache") },
  });
  return path.join(destinationDir, coreArtifactName(packageJson.version));
};

const main = async () => {
  const actorDir = process.argv[2];
  if (!actorDir) {
    console.error("Usage: node scripts/package-feedback-core.mjs <actor-directory>");
    process.exitCode = 2;
    return;
  }
  console.log(await packageCoreForActor({ actorDir }));
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
