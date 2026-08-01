import { describe, expect, it } from "vitest";

import { validateRelease } from "../../scripts/validate-release.mjs";

describe("publish-readiness contract", () => {
  it("accepts the complete Actor contract and documentation", async () => {
    const result = await validateRelease(new URL("../../", import.meta.url));
    expect(result).toEqual({ valid: true, errors: [] });
  });
});
