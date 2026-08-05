export const createDeadline = ({ softSecs = 180, hardSecs = 240, startedAt = Date.now() } = {}) => {
    if (!Number.isFinite(softSecs) || !Number.isFinite(hardSecs) || softSecs < 0 || hardSecs < softSecs) {
        const error = new Error('hardSecs must be greater than or equal to softSecs.');
        error.code = 'INVALID_INPUT';
        throw error;
    }
    const softMs = softSecs * 1000;
    const hardMs = hardSecs * 1000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(0, startedAt + hardMs - Date.now()));
    timer.unref?.();
    return {
        startedAt,
        softAt: startedAt + softMs,
        hardAt: startedAt + hardMs,
        signal: controller.signal,
        isSoftReached: () => Date.now() >= startedAt + softMs,
        isHardReached: () => Date.now() >= startedAt + hardMs,
        remainingMs: () => Math.max(0, startedAt + hardMs - Date.now()),
        dispose: () => clearTimeout(timer),
    };
};
