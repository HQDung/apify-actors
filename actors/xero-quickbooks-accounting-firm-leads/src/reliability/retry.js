const transientStatuses = new Set([408, 425, 429]);

export const isRetryableError = (error) => {
  const status = Number(error?.status ?? error?.statusCode);
  if (transientStatuses.has(status) || (status >= 500 && status <= 599)) {
    return true;
  }
  return /(?:timeout|timed out|network|econnreset|temporar|navigation)/iu.test(
    String(error?.message ?? error),
  );
};

const wait = (milliseconds) =>
  milliseconds > 0
    ? new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
      })
    : Promise.resolve();

export const withTimeout = (operation, milliseconds) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Operation timed out after ${milliseconds}ms.`)),
      milliseconds,
    );
  });
  return Promise.race([Promise.resolve().then(operation), timeout]).finally(
    () => clearTimeout(timer),
  );
};

export const retryOperation = async (
  operation,
  {
    attempts = 3,
    delayMs = 250,
    shouldRetry = isRetryableError,
    onRetry = async () => {},
  } = {},
) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetry(error)) throw error;
      const backoff = delayMs * 2 ** (attempt - 1);
      const jitter =
        backoff > 0 ? Math.floor(Math.random() * Math.max(1, delayMs)) : 0;
      await onRetry({ error, attempt, nextAttempt: attempt + 1 });
      await wait(backoff + jitter);
    }
  }
  throw lastError;
};
