import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("copies the vendored shared core before npm install", async () => {
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
