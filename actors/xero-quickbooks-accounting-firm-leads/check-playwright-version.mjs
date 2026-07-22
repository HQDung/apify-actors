import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (packageJson.dependencies.playwright !== "1.60.0") {
  throw new Error("Playwright must match the Actor base image version 1.60.0.");
}
