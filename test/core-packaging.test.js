import test from "node:test";
import assert from "node:assert/strict";

import { coreArtifactName } from "../scripts/package-feedback-core.mjs";

test("uses a deterministic core package artifact name", () => {
  assert.equal(coreArtifactName("1.0.0"), "project-feedback-analysis-core-1.0.0.tgz");
});
