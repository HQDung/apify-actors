import { createActorError } from './errors.js';

export const requestText = async (
    url,
    { fetchImpl = globalThis.fetch, headers = {}, timeoutMs = 25_000, signal, sourceName, circuitBreaker } = {},
) => {
    const operation = async () => {
        const controller = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeoutMs);
        const forwardAbort = () => controller.abort();
        if (signal) {
            if (signal.aborted) controller.abort();
            else signal.addEventListener('abort', forwardAbort, { once: true });
        }
        try {
            const response = await fetchImpl(url, {
                method: 'GET',
                headers: {
                    accept: 'text/html,application/xhtml+xml',
                    'user-agent': 'MangaReleaseLicensingIntelligence/0.1 (+https://apify.com/)',
                    ...headers,
                },
                signal: controller.signal,
            });
            if (!response.ok) {
                if (response.status === 429) {
                    throw createActorError('RATE_LIMITED', `HTTP 429 from ${new URL(url).hostname}`, {
                        status: response.status,
                        sourceName,
                        retryable: true,
                    });
                }
                const error = new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
                error.status = response.status;
                error.sourceName = sourceName;
                error.retryable = response.status >= 500 || response.status === 408 || response.status === 425;
                throw error;
            }
            return await response.text();
        } catch (error) {
            if (timedOut) {
                throw createActorError('REQUEST_TIMEOUT', `Request timed out for ${new URL(url).hostname}.`, {
                    sourceName,
                    sourceUrl: String(url),
                    retryable: true,
                });
            }
            if (signal?.aborted) {
                throw createActorError('RUN_DEADLINE_REACHED', `Request cancelled for ${new URL(url).hostname}.`, {
                    sourceName,
                    sourceUrl: String(url),
                    retryable: false,
                });
            }
            throw error;
        } finally {
            clearTimeout(timer);
            signal?.removeEventListener('abort', forwardAbort);
        }
    };
    return circuitBreaker ? circuitBreaker.execute(operation) : operation();
};
