export const DEFAULT_RUNTIME_POLICY = Object.freeze({
  browserConcurrency: 4,
  websiteConcurrency: 3,
  timeoutMs: 30_000,
  navigationTimeoutMs: 60_000,
  maxRedirects: 3,
  maxAttempts: 2,
  retryBaseDelayMs: 250,
  maxResponseChars: 2_000_000,
});

const retryableStatuses = new Set([408, 425, 429]);
const retryableCodes = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EAI_AGAIN",
]);

export const statusFromError = (error) =>
  Number(error?.status ?? error?.statusCode ?? error?.response?.status) || null;

export const isRetryableError = (error) => {
  const status = statusFromError(error);
  if (status && (retryableStatuses.has(status) || status >= 500)) return true;
  if (retryableCodes.has(error?.code)) return true;
  if (error?.name === "AbortError") return true;
  return /(?:abort|timed?s*out|timeout|network|socket|fetch failed)/i.test(
    error?.message ?? "",
  );
};

export const isBlockedStatus = (status) =>
  [401, 403, 406, 451].includes(Number(status));

const wait = (delayMs) =>
  delayMs > 0
    ? new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      })
    : Promise.resolve();

export const retryOperation = async (
  operation,
  {
    maxAttempts = DEFAULT_RUNTIME_POLICY.maxAttempts,
    baseDelayMs = DEFAULT_RUNTIME_POLICY.retryBaseDelayMs,
    onRetry,
  } = {},
) => {
  const attempts = Math.max(1, Math.floor(maxAttempts));
  let attempt = 0;
  while (attempt < attempts) {
    attempt += 1;
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= attempts || !isRetryableError(error)) throw error;
      const delayMs = Math.min(
        1_000,
        Math.max(0, baseDelayMs) * 2 ** (attempt - 1),
      );
      onRetry?.({ attempt, delayMs, error });
      await wait(delayMs);
    }
  }
  throw new Error("Retry operation exhausted without a result.");
};
