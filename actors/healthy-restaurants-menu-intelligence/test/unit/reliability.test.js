import { describe, expect, it } from "vitest";

import {
  DEFAULT_RUNTIME_POLICY,
  isRetryableError,
  retryOperation,
} from "../../src/runtime/reliability.js";

describe("runtime reliability policy", () => {
  it("keeps Version 1 concurrency and network limits bounded", () => {
    expect(DEFAULT_RUNTIME_POLICY).toMatchObject({
      browserConcurrency: 4,
      websiteConcurrency: 3,
      timeoutMs: 30_000,
      navigationTimeoutMs: 60_000,
      maxRedirects: 3,
      maxAttempts: 2,
    });
  });

  it("retries a transient operation once and returns its later result", async () => {
    let attempts = 0;
    const result = await retryOperation(
      async () => {
        attempts += 1;
        if (attempts === 1)
          throw Object.assign(new Error("reset"), { code: "ECONNRESET" });
        return "ok";
      },
      { maxAttempts: 2, baseDelayMs: 0 },
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("does not retry deterministic invalid-input failures", async () => {
    let attempts = 0;
    await expect(
      retryOperation(
        async () => {
          attempts += 1;
          throw Object.assign(new Error("invalid URL"), {
            code: "ERR_INVALID_URL",
          });
        },
        { maxAttempts: 2, baseDelayMs: 0 },
      ),
    ).rejects.toThrow("invalid URL");
    expect(attempts).toBe(1);
    expect(
      isRetryableError(Object.assign(new Error("bad"), { status: 404 })),
    ).toBe(false);
  });
});
