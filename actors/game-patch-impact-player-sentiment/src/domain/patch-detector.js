import { PATCH_CONFIDENCE_THRESHOLD } from '../config.js';

const clamp = (value) => Math.max(0, Math.min(1, Number(value.toFixed(2))));
const lower = (value) => String(value ?? '').toLowerCase();
const hasAny = (value, terms) => terms.some((term) => lower(value).includes(term));

const strongTitleTerms = [
    'patch',
    'patch notes',
    'hotfix',
    'major update',
    'balance update',
    'maintenance update',
    'changelog',
];
const generalUpdateTerms = ['update', 'version', 'fixes'];
const changeTerms = ['fix', 'bug', 'balance', 'change', 'improvement', 'crash', 'stability'];
const promotionTerms = ['sale', 'discount', 'bundle', 'soundtrack', 'merch', 'award'];
const eventTerms = ['tournament', 'esports', 'contest', 'stream', 'predictions', 'fantasy', 'supporter'];

export const scorePatchCandidate = (item, latestPublishedAt = null) => {
    const title = lower(item.title);
    const content = lower(item.content);
    let score = 0;
    const signals = [];
    if (hasAny(title, strongTitleTerms)) {
        score += 0.45;
        signals.push('patch keyword');
    } else if (hasAny(title, generalUpdateTerms)) {
        score += 0.25;
        signals.push('update keyword');
    }
    if (changeTerms.filter((term) => content.includes(term)).length >= 2) {
        score += 0.2;
        signals.push('change/fix content');
    }
    if (!item.isExternal) {
        score += 0.15;
        signals.push('Steam announcement');
    } else {
        score -= 0.2;
        signals.push('external article');
    }
    if (/\b(?:v|version\s*)?\d+\.\d+(?:[a-z])?\b/i.test(item.title)) {
        score += 0.1;
        signals.push('version pattern');
    }
    if (latestPublishedAt && item.publishedAt === latestPublishedAt) {
        score += 0.1;
        signals.push('latest news item');
    }
    if (hasAny(title, promotionTerms)) {
        score -= 0.4;
        signals.push('promotion signal');
    }
    if (hasAny(title, eventTerms)) {
        score -= 0.3;
        signals.push('event signal');
    }
    const confidence = clamp(score);
    return {
        ...item,
        confidence,
        accepted: confidence >= PATCH_CONFIDENCE_THRESHOLD,
        signals,
    };
};

export const detectPatchCandidate = (newsItems = []) => {
    if (!Array.isArray(newsItems) || newsItems.length === 0) return null;
    const latestPublishedAt =
        newsItems
            .map((item) => item.publishedAt)
            .filter(Boolean)
            .sort()
            .at(-1) ?? null;
    return newsItems
        .map((item) => scorePatchCandidate(item, latestPublishedAt))
        .sort(
            (left, right) =>
                right.confidence - left.confidence ||
                String(left.publishedAt).localeCompare(String(right.publishedAt)) ||
                left.title.localeCompare(right.title),
        )[0];
};

export const resolveComparisonBoundary = ({ input, newsItems = [] }) => {
    if (input.comparisonMode !== 'latest_patch') {
        return {
            effectiveComparisonMode: input.comparisonMode,
            patch: null,
            patchBoundary: input.comparisonMode === 'custom_patch_date' ? input.patchDate : null,
            warnings: [],
        };
    }
    const patch = detectPatchCandidate(newsItems);
    if (patch?.accepted) {
        return {
            effectiveComparisonMode: 'latest_patch',
            patch,
            patchBoundary: patch.publishedAt,
            warnings: [],
        };
    }
    return {
        effectiveComparisonMode: 'recent_vs_previous',
        patch,
        patchBoundary: null,
        warnings: ['PATCH_DETECTION_FALLBACK'],
    };
};
