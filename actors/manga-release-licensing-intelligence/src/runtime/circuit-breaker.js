import { createActorError } from './errors.js';

export const createCircuitBreaker = ({
    failureThreshold = 3,
    resetAfterMs = 30_000,
    now = () => Date.now(),
} = {}) => {
    let failures = 0;
    let openedAt = null;

    const isOpen = () => openedAt !== null && now() - openedAt < resetAfterMs;

    const execute = async (operation) => {
        if (isOpen()) {
            throw createActorError('SOURCE_CIRCUIT_OPEN', 'Source circuit is open after repeated failures.', {
                retryable: false,
            });
        }
        if (openedAt !== null) openedAt = null;
        try {
            const value = await operation();
            failures = 0;
            openedAt = null;
            return value;
        } catch (error) {
            if (error?.retryable !== false) {
                failures += 1;
                if (failures >= failureThreshold) openedAt = now();
            }
            throw error;
        }
    };

    return {
        execute,
        state: () => (isOpen() ? 'open' : 'closed'),
        failures: () => failures,
    };
};

export const createCircuitBreakerRegistry = (options = {}) => {
    const breakers = new Map();
    const forSource = (sourceName) => {
        if (!breakers.has(sourceName)) breakers.set(sourceName, createCircuitBreaker(options));
        return breakers.get(sourceName);
    };
    return {
        forSource,
        states: () => Object.fromEntries([...breakers].map(([name, breaker]) => [name, {
            state: breaker.state(),
            failures: breaker.failures(),
        }])),
    };
};
