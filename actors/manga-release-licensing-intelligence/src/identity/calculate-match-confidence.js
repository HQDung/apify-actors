import { normalizeTitle } from './normalize-title.js';

export const calculateMatchConfidence = (queryTitle, work) => {
    const query = normalizeTitle(queryTitle);
    if (typeof work.nativeTitle === 'string' && queryTitle.trim() === work.nativeTitle.trim()) {
        return { status: 'matched', confidence: 0.97, matchedBy: ['nativeTitle'] };
    }
    const canonical = normalizeTitle(work.canonicalTitle);
    if (query && query === canonical) {
        return { status: 'matched', confidence: 0.98, matchedBy: ['canonicalTitle'] };
    }

    const aliases = (work.aliases ?? []).map((alias) =>
        typeof alias === 'string' ? alias : alias.title,
    );
    if (aliases.some((alias) => normalizeTitle(alias) === query)) {
        return { status: 'matched', confidence: 0.95, matchedBy: ['alias'] };
    }

    return { status: 'ambiguous', confidence: 0.65, matchedBy: [] };
};
