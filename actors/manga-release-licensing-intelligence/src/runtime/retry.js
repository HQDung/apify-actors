const defaultRetryable = (error) => {
    if (error?.retryable === false) return false;
    const status = Number(error?.status ?? error?.statusCode ?? 0);
    return status === 408 || status === 425 || status === 429 || status >= 500 || !status;
};

export const withRetry = async (
    operation,
    { retries = 2, delayMs = 250, shouldRetry = defaultRetryable, onRetry } = {},
) => {
    let attempt = 0;
    while (true) {
        try {
            return await operation(attempt);
        } catch (error) {
            if (attempt >= retries || !shouldRetry(error)) throw error;
            attempt += 1;
            if (onRetry) await onRetry({ attempt, error });
            const waitMs = delayMs * 2 ** (attempt - 1);
            if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
    }
};
