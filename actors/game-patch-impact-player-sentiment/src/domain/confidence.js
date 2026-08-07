const coverageQuality = (status) => {
    if (status === 'full') return 1;
    if (status === 'partial') return 0.65;
    if (status === 'insufficient') return 0.25;
    return 0.5;
};

const confidenceLabelFor = (confidence) => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
};

export const calculateConfidence = ({
    beforeCoverage = {},
    afterCoverage = {},
    beforeReviewCount = beforeCoverage.analyzedReviews ?? 0,
    afterReviewCount = afterCoverage.analyzedReviews ?? 0,
    sentimentDelta = 0,
    themeConsistency = 0.8,
    patch = null,
    comparisonMode = 'recent_vs_previous',
}) => {
    const sampleAdequacy = Math.min(1, Math.min(beforeReviewCount, afterReviewCount) / 40);
    const windowCoverage = Math.min(
        coverageQuality(beforeCoverage.coverageStatus),
        coverageQuality(afterCoverage.coverageStatus),
    );
    const sentimentMagnitude = Math.min(1, Math.abs(sentimentDelta) / 0.1);
    let patchDateConfidence = 1;
    if (comparisonMode === 'latest_patch') patchDateConfidence = patch?.accepted ? (patch.confidence ?? 0) : 0.4;
    const rawConfidence =
        comparisonMode === 'latest_patch'
            ? sampleAdequacy * 0.3 +
              windowCoverage * 0.3 +
              themeConsistency * 0.2 +
              sentimentMagnitude * 0.1 +
              patchDateConfidence * 0.1
            : sampleAdequacy * 0.35 + windowCoverage * 0.35 + themeConsistency * 0.2 + sentimentMagnitude * 0.1;
    const insufficient =
        beforeReviewCount < 8 ||
        afterReviewCount < 8 ||
        beforeCoverage.coverageStatus === 'insufficient' ||
        afterCoverage.coverageStatus === 'insufficient';
    const partial = beforeCoverage.coverageStatus !== 'full' || afterCoverage.coverageStatus !== 'full';
    let confidence = rawConfidence;
    if (partial) confidence = Math.min(confidence, 0.69);
    if (insufficient) confidence = Math.min(confidence, 0.39);
    confidence = Math.max(0, Math.min(1, confidence));
    return {
        confidence,
        confidenceLabel: confidenceLabelFor(confidence),
        components: { sampleAdequacy, windowCoverage, themeConsistency, sentimentMagnitude, patchDateConfidence },
    };
};
