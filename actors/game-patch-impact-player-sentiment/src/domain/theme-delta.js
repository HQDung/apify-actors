const evidenceText = (evidence = []) =>
    evidence.map((item) => (typeof item === 'string' ? item : item?.text)).filter(Boolean);

const themeMap = (themes = []) => new Map(themes.map((theme) => [theme.theme, theme]));

const rate = (mentions, reviewCount) => (reviewCount > 0 ? Number((mentions / reviewCount).toFixed(12)) : 0);

export const compareThemes = ({ before, after }) => {
    const beforeThemes = themeMap(before?.themes);
    const afterThemes = themeMap(after?.themes);
    const names = new Set([...beforeThemes.keys(), ...afterThemes.keys()]);
    return [...names]
        .map((theme) => {
            const beforeTheme = beforeThemes.get(theme) ?? {};
            const afterTheme = afterThemes.get(theme) ?? {};
            const beforeMentions = beforeTheme.mentions ?? 0;
            const afterMentions = afterTheme.mentions ?? 0;
            const beforeNegativeMentions = beforeTheme.negativeMentions ?? 0;
            const afterNegativeMentions = afterTheme.negativeMentions ?? 0;
            const beforeMentionRate = rate(beforeMentions, before?.reviewCount ?? 0);
            const afterMentionRate = rate(afterMentions, after?.reviewCount ?? 0);
            const negativeShareBefore = beforeMentions > 0 ? beforeNegativeMentions / beforeMentions : 0;
            const negativeShareAfter = afterMentions > 0 ? afterNegativeMentions / afterMentions : 0;
            return {
                theme,
                beforeMentions,
                afterMentions,
                beforeMentionRate,
                afterMentionRate,
                mentionRateDelta: Number((afterMentionRate - beforeMentionRate).toFixed(12)),
                negativeShareBefore,
                negativeShareAfter,
                negativeShareDelta: Number((negativeShareAfter - negativeShareBefore).toFixed(12)),
                beforeNegativeMentions,
                afterNegativeMentions,
                negativeMentionRateBefore: rate(beforeNegativeMentions, before?.reviewCount ?? 0),
                negativeMentionRateAfter: rate(afterNegativeMentions, after?.reviewCount ?? 0),
                evidence: evidenceText(afterTheme.evidence ?? beforeTheme.evidence),
                beforeEvidence: evidenceText(beforeTheme.evidence),
                afterEvidence: evidenceText(afterTheme.evidence),
            };
        })
        .sort((left, right) => right.afterMentionRate - left.afterMentionRate || left.theme.localeCompare(right.theme));
};

export const detectNewIssues = (themeDeltas) =>
    themeDeltas.filter(
        ({ beforeMentionRate, afterMentionRate, afterMentions, negativeShareAfter }) =>
            beforeMentionRate <= 0.05 && afterMentionRate >= 0.12 && afterMentions >= 3 && negativeShareAfter >= 0.6,
    );

export const detectRegressions = (themeDeltas) =>
    themeDeltas.filter(
        ({ mentionRateDelta, afterMentions, negativeShareAfter }) =>
            mentionRateDelta >= 0.08 && afterMentions >= 3 && negativeShareAfter >= 0.6,
    );

export const detectImprovements = (themeDeltas) =>
    themeDeltas.filter(
        ({ negativeMentionRateBefore, negativeMentionRateAfter, beforeNegativeMentions = 0 }) =>
            beforeNegativeMentions >= 3 && negativeMentionRateBefore - negativeMentionRateAfter >= 0.08,
    );

const requestMap = (requests = []) => new Map(requests.map((request) => [request.request.toLowerCase(), request]));

export const compareFeatureRequests = ({ before, after }) => {
    const beforeRequests = requestMap(before?.featureRequests);
    const afterRequests = requestMap(after?.featureRequests);
    const keys = new Set([...beforeRequests.keys(), ...afterRequests.keys()]);
    return [...keys]
        .map((key) => {
            const beforeRequest = beforeRequests.get(key) ?? {};
            const afterRequest = afterRequests.get(key) ?? {};
            const afterCount = afterRequest.count ?? 0;
            return {
                request: afterRequest.request ?? beforeRequest.request ?? key,
                count: afterCount,
                beforeCount: beforeRequest.count ?? 0,
                afterCount,
                evidence: evidenceText(afterRequest.evidence ?? beforeRequest.evidence),
            };
        })
        .filter(({ count }) => count > 0)
        .sort((left, right) => right.count - left.count || left.request.localeCompare(right.request));
};
