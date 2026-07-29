import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);
const expectedVersion = packageJson.dependencies?.playwright;
const installedVersion = execFileSync(
  "node",
  ["-e", "console.log(require('playwright/package.json').version)"],
  {
    encoding: "utf8",
  },
).trim();

if (expectedVersion && expectedVersion !== installedVersion) {
  throw new Error(
    `Playwright version mismatch. package.json: ${expectedVersion}, installed: ${installedVersion}`,
  );
}
