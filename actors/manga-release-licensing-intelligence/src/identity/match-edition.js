import { normalizeTitle } from './normalize-title.js';

const same = (left, right) => left !== null && left !== undefined && left === right;

export const matchEditions = (left, right) => {
    if (!left || !right || left.workId !== right.workId) {
        return { status: 'notFound', confidence: 0, matchedBy: [] };
    }
    if (left.editionId && right.editionId && left.editionId === right.editionId) {
        return { status: 'matched', confidence: 1, matchedBy: ['editionId'] };
    }
    if (left.isbn13 && right.isbn13) {
        return left.isbn13 === right.isbn13
            ? { status: 'matched', confidence: 0.99, matchedBy: ['isbn13'] }
            : { status: 'notFound', confidence: 0, matchedBy: [] };
    }
    if ((left.isbn13 || left.isbn10) && (right.isbn13 || right.isbn10)) {
        return { status: 'notFound', confidence: 0, matchedBy: [] };
    }
    if (left.countryCode !== right.countryCode || left.languageCode !== right.languageCode) {
        return { status: 'notFound', confidence: 0, matchedBy: [] };
    }
    if (left.editionType !== right.editionType || left.format !== right.format) {
        return { status: 'notFound', confidence: 0, matchedBy: [] };
    }
    if (same(left.volumeNumber, right.volumeNumber) && normalizeTitle(left.publisher) === normalizeTitle(right.publisher)) {
        return { status: 'matched', confidence: 0.9, matchedBy: ['market', 'publisher', 'volume', 'editionType', 'format'] };
    }
    return { status: 'ambiguous', confidence: 0.5, matchedBy: [] };
};

export const deduplicateEditions = (editions) => {
    const byId = new Map();
    for (const edition of editions ?? []) {
        const existing = byId.get(edition.editionId);
        if (!existing) byId.set(edition.editionId, edition);
        else {
            byId.set(edition.editionId, {
                ...existing,
                ...edition,
                sourceUrl: existing.sourceUrl ?? edition.sourceUrl,
                sourceTitle: existing.sourceTitle ?? edition.sourceTitle,
            });
        }
    }
    return [...byId.values()];
};
