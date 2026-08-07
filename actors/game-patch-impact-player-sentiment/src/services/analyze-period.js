import { analyzeGameFeedback } from '../core/feedback-core-adapter.js';

const MAX_EVIDENCE_PER_GROUP = 2;

const cleanSnippet = (value, limit = 240) =>
    String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, limit);

const addTheme = (themes, theme, record, analysis, includeEvidence) => {
    const existing = themes.get(theme) ?? { theme, mentions: 0, negativeMentions: 0, evidence: [] };
    existing.mentions += 1;
    if (record.positive === false) existing.negativeMentions += 1;
    if (includeEvidence && existing.evidence.length < MAX_EVIDENCE_PER_GROUP) {
        existing.evidence.push({
            reviewId: String(record.id),
            text: cleanSnippet(record.text),
            sentiment: analysis.sentiment,
        });
    }
    themes.set(theme, existing);
};

const addFeatureRequest = (requests, analysis, record, includeEvidence) => {
    const request = analysis.featureRequest?.title;
    if (!request) return;
    const key = request.toLowerCase();
    const existing = requests.get(key) ?? { request, count: 0, evidence: [] };
    existing.count += 1;
    if (includeEvidence && existing.evidence.length < MAX_EVIDENCE_PER_GROUP) {
        existing.evidence.push({ reviewId: String(record.id), text: cleanSnippet(record.text) });
    }
    requests.set(key, existing);
};

export const analyzePeriod = async ({ feedback = [], includeEvidence = true }) => {
    const themes = new Map();
    const featureRequests = new Map();
    const languageDistribution = {};
    const analyses = [];
    let positive = 0;
    let negative = 0;

    for (const record of feedback) {
        const language = String(record.language ?? 'unknown');
        languageDistribution[language] = (languageDistribution[language] ?? 0) + 1;
        if (record.positive === true) positive += 1;
        if (record.positive === false) negative += 1;
        const analysis = await analyzeGameFeedback(record);
        analyses.push({ reviewId: String(record.id), analysis });
        for (const theme of analysis.topics) addTheme(themes, theme, record, analysis, includeEvidence);
        addFeatureRequest(featureRequests, analysis, record, includeEvidence);
    }

    const reviewCount = feedback.length;
    const themeResults = [...themes.values()]
        .map((theme) => ({
            ...theme,
            mentionRate: reviewCount > 0 ? theme.mentions / reviewCount : 0,
            negativeShare: theme.mentions > 0 ? theme.negativeMentions / theme.mentions : 0,
        }))
        .sort((left, right) => right.mentions - left.mentions || left.theme.localeCompare(right.theme));
    const requestResults = [...featureRequests.values()].sort(
        (left, right) => right.count - left.count || left.request.localeCompare(right.request),
    );

    return {
        reviewCount,
        positive,
        negative,
        positiveRate: reviewCount > 0 ? positive / reviewCount : 0,
        themes: themeResults,
        featureRequests: requestResults,
        languageDistribution,
        analyses,
    };
};
