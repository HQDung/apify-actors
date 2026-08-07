const dayMs = 24 * 60 * 60 * 1000;

const isoAt = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error('Comparison boundary must be a valid date.');
    return date.toISOString();
};

export const resolveComparisonWindow = ({
    mode,
    windowDays,
    patchDate = null,
    patchBoundary = null,
    now = new Date().toISOString(),
}) => {
    const nowAt = isoAt(now);
    let boundaryAt;
    if (mode === 'custom_patch_date') {
        boundaryAt = isoAt(patchDate);
    } else if (patchBoundary) {
        boundaryAt = isoAt(patchBoundary);
    } else {
        boundaryAt = new Date(new Date(nowAt).getTime() - windowDays * dayMs).toISOString();
    }
    const boundaryMs = new Date(boundaryAt).getTime();
    const nowMs = new Date(nowAt).getTime();
    if (boundaryMs > nowMs) throw new Error('Comparison boundary cannot be in the future.');
    return {
        boundaryAt,
        before: {
            startAt: new Date(boundaryMs - windowDays * dayMs).toISOString(),
            endAt: boundaryAt,
        },
        after: {
            startAt: boundaryAt,
            endAt: nowAt,
        },
    };
};

export const assignReviewPeriod = (createdAt, windows) => {
    const timestamp = new Date(createdAt).getTime();
    if (!Number.isFinite(timestamp)) return null;
    const beforeStart = new Date(windows.before.startAt).getTime();
    const boundary = new Date(windows.before.endAt).getTime();
    const afterEnd = new Date(windows.after.endAt).getTime();
    if (timestamp >= beforeStart && timestamp < boundary) return 'before';
    if (timestamp >= boundary && timestamp <= afterEnd) return 'after';
    return null;
};
