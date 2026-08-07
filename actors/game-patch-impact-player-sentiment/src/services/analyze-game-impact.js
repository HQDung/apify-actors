import { calculateConfidence } from '../domain/confidence.js';
import { compareSentiment } from '../domain/sentiment-delta.js';
import {
    compareFeatureRequests,
    compareThemes,
    detectImprovements,
    detectNewIssues,
    detectRegressions,
} from '../domain/theme-delta.js';
import { buildReport } from '../output/report-builder.js';
import { analyzePeriod } from './analyze-period.js';

export const analyzeGameImpact = async ({
    collection,
    input,
    effectiveComparisonMode = collection.effectiveComparisonMode ?? input.comparisonMode,
    patch = collection.patch ?? null,
    generatedAt = new Date().toISOString(),
}) => {
    const beforeCollection = collection.periods?.before ?? { reviews: [], coverage: {} };
    const afterCollection = collection.periods?.after ?? { reviews: [], coverage: {} };
    const before = {
        ...(await analyzePeriod({ feedback: beforeCollection.reviews ?? [], includeEvidence: input.includeEvidence })),
        coverage: beforeCollection.coverage ?? {},
    };
    const after = {
        ...(await analyzePeriod({ feedback: afterCollection.reviews ?? [], includeEvidence: input.includeEvidence })),
        coverage: afterCollection.coverage ?? {},
    };
    const comparison = compareSentiment({ before, after });
    const themeDeltas = compareThemes({ before, after });
    const newIssues = detectNewIssues(themeDeltas);
    const regressions = detectRegressions(themeDeltas);
    const improvements = detectImprovements(themeDeltas);
    const featureRequests = compareFeatureRequests({ before, after });
    const confidence = calculateConfidence({
        beforeCoverage: before.coverage,
        afterCoverage: after.coverage,
        beforeReviewCount: before.reviewCount,
        afterReviewCount: after.reviewCount,
        sentimentDelta: comparison.sentimentDelta,
        patch,
        comparisonMode: effectiveComparisonMode,
    });
    return buildReport({
        collection,
        input,
        effectiveComparisonMode,
        patch,
        before,
        after,
        comparison,
        newIssues,
        regressions,
        improvements,
        featureRequests,
        confidence,
        generatedAt,
    });
};
