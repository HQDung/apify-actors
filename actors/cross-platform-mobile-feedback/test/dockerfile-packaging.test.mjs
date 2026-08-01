import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

test("copies the vendored comparison core before npm install", async () => {
  const dockerfile = await readFile(
    new URL("../Dockerfile", import.meta.url),
    "utf8",
  );
  const vendorCopyIndex = dockerfile.indexOf(
    "COPY --chown=myuser:myuser vendor ./vendor",
  );
  const installIndex = dockerfile.indexOf(
    "npm install --omit=dev --omit=optional",
  );

  assert.notEqual(vendorCopyIndex, -1);
  assert.notEqual(installIndex, -1);
  assert.ok(vendorCopyIndex < installIndex);
});

test("packages every local core dependency used by the Actor", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const dependencies = [
    "@project/cross-platform-comparison-core",
    "@project/feedback-analysis-core",
    "@project/mobile-feedback-source-adapters",
  ];

  for (const dependency of dependencies) {
    assert.match(packageJson.dependencies[dependency], /^file:vendor\//);
  }

  await Promise.all(
    dependencies.map((dependency) =>
      access(
        new URL(
          `../${packageJson.dependencies[dependency].replace(/^file:/, "")}`,
          import.meta.url,
        ),
      ),
    ),
  );
});
