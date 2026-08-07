const unique = (values) => [...new Set(values.filter(Boolean))];

const formatRate = (value) => `${(value * 100).toFixed(1)}%`;

const formatDelta = (value) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)} percentage points`;

const mergeLanguageDistribution = (before = {}, after = {}) => {
    const result = { ...before };
    for (const [language, count] of Object.entries(after)) result[language] = (result[language] ?? 0) + count;
    return result;
};

const comparisonPeriod = (analysis, window) => ({
    startAt: window?.startAt ?? null,
    endAt: window?.endAt ?? null,
    reviewsAnalyzed: analysis.reviewCount,
    positive: analysis.positive,
    negative: analysis.negative,
    positiveRate: analysis.positiveRate,
});

const finding = (theme) => ({
    theme: theme.theme,
    beforeMentions: theme.beforeMentions,
    afterMentions: theme.afterMentions,
    beforeMentionRate: theme.beforeMentionRate,
    afterMentionRate: theme.afterMentionRate,
    mentionRateDelta: theme.mentionRateDelta,
    negativeShareAfter: theme.negativeShareAfter,
    evidence: theme.evidence,
});

const topThemes = (analysis, negative) =>
    analysis.themes
        .map((theme) => ({
            theme: theme.theme,
            mentions: theme.mentions,
            negativeMentions: theme.negativeMentions,
            mentionRate: theme.mentionRate,
            negativeShare: theme.negativeShare,
            evidence: theme.evidence.map((item) => (typeof item === 'string' ? item : item.text)).filter(Boolean),
            positiveMentions: theme.mentions - theme.negativeMentions,
        }))
        .filter((theme) => (negative ? theme.negativeMentions > 0 : theme.positiveMentions > 0))
        .sort((left, right) => {
            const leftScore = negative ? left.negativeMentions : left.positiveMentions;
            const rightScore = negative ? right.negativeMentions : right.positiveMentions;
            return rightScore - leftScore || left.theme.localeCompare(right.theme);
        })
        .slice(0, 5);

const summaryFor = ({ direction, beforeRate, afterRate, sentimentDelta, newIssues, regressions, improvements }) => {
    if (direction === 'insufficient_data') {
        return 'The comparison has insufficient analyzed reviews to assign a sentiment direction. Review coverage and sample counts should be considered before interpreting themes.';
    }
    let directionText = 'remained stable';
    if (direction.includes('positive')) directionText = 'increased';
    else if (direction.includes('negative')) directionText = 'decreased';
    const first = `Player recommendation sentiment ${directionText} from ${formatRate(beforeRate)} to ${formatRate(afterRate)} (${formatDelta(sentimentDelta)}).`;
    const findings = unique([
        newIssues.length > 0
            ? `New complaint themes met the threshold: ${newIssues
                  .map(({ theme }) => theme)
                  .slice(0, 3)
                  .join(', ')}.`
            : '',
        regressions.length > 0
            ? `Observed regressions met the threshold in ${regressions
                  .map(({ theme }) => theme)
                  .slice(0, 3)
                  .join(', ')}.`
            : '',
        improvements.length > 0
            ? `Observed improvements met the threshold in ${improvements
                  .map(({ theme }) => theme)
                  .slice(0, 3)
                  .join(', ')}.`
            : '',
    ]);
    return [first, findings[0] ?? 'No threshold-level new issue, regression, or improvement was detected.'].join(' ');
};

export const buildReport = ({
    collection,
    input,
    effectiveComparisonMode = input?.comparisonMode,
    patch = null,
    before,
    after,
    comparison,
    newIssues = [],
    regressions = [],
    improvements = [],
    featureRequests = [],
    confidence,
    generatedAt = new Date().toISOString(),
}) => {
    const emptyPeriod = {
        reviewCount: 0,
        positive: 0,
        negative: 0,
        positiveRate: 0,
        themes: [],
        featureRequests: [],
        languageDistribution: {},
        coverage: {},
    };
    const beforeAnalysis = before ?? emptyPeriod;
    const afterAnalysis = after ?? emptyPeriod;
    const windows = collection?.windows ?? {};
    let status = 'ok';
    if (collection?.status === 'failed') status = 'failed';
    else if ([beforeAnalysis.coverage, afterAnalysis.coverage].some(({ coverageStatus }) => coverageStatus !== 'full'))
        status = 'partial';
    const warnings = unique(collection?.warnings ?? []);
    const stats = collection?.stats ?? {};
    return {
        status,
        steamAppId: collection?.game?.steamAppId ?? null,
        gameName: collection?.game?.gameName ?? null,
        storeUrl: collection?.game?.storeUrl ?? null,
        errorCode: collection?.errorCode ?? null,
        errorMessage: collection?.errorMessage ?? null,
        requestedComparisonMode: input?.comparisonMode ?? null,
        effectiveComparisonMode,
        generatedAt,
        comparison: {
            boundaryAt: windows.boundaryAt ?? null,
            windowDays: input?.windowDays ?? null,
            before: comparisonPeriod(beforeAnalysis, windows.before),
            after: comparisonPeriod(afterAnalysis, windows.after),
            sentimentDelta: comparison?.sentimentDelta ?? 0,
        },
        impact: {
            direction: comparison?.direction ?? 'insufficient_data',
            summary: summaryFor({
                direction: comparison?.direction ?? 'insufficient_data',
                beforeRate: beforeAnalysis.positiveRate,
                afterRate: afterAnalysis.positiveRate,
                sentimentDelta: comparison?.sentimentDelta ?? 0,
                newIssues,
                regressions,
                improvements,
            }),
            confidence: confidence?.confidence ?? 0,
            confidenceLabel: confidence?.confidenceLabel ?? 'low',
        },
        patch,
        newIssues: newIssues.map(finding),
        regressions: regressions.map(finding),
        improvements: improvements.map(finding),
        featureRequests,
        topNegativeThemes: topThemes(afterAnalysis, true),
        topPositiveThemes: topThemes(afterAnalysis, false),
        coverage: { before: beforeAnalysis.coverage ?? {}, after: afterAnalysis.coverage ?? {} },
        languageDistribution: mergeLanguageDistribution(
            beforeAnalysis.languageDistribution,
            afterAnalysis.languageDistribution,
        ),
        warnings,
        stats: {
            reviewsScanned: stats.reviewsScanned ?? 0,
            reviewsAnalyzed: stats.reviewsAnalyzed ?? beforeAnalysis.reviewCount + afterAnalysis.reviewCount,
            reviewPagesFetched: stats.pagesFetched ?? stats.reviewPagesFetched ?? 0,
            newsItemsFetched: stats.newsItemsFetched ?? 0,
            durationMs: stats.durationMs ?? 0,
        },
    };
};
