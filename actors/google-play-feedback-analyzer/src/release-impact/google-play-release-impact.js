import { compareFeedbackWindows } from '@project/feedback-analysis-core';

const dayMs = 24 * 60 * 60 * 1000;
const analysisOf = (record) => record.analysis ?? {};
const successful = (records) =>
    records.filter((record) => analysisOf(record).analysisStatus === 'success' && record.analysis);

const countBy = (records, keyFor) => {
    const counts = new Map();
    for (const record of records) {
        const key = keyFor(record);
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
};

const changesFrom = (beforeRecords, afterRecords, keyFor) => {
    const before = countBy(beforeRecords, keyFor);
    const after = countBy(afterRecords, keyFor);
    return [...new Set([...before.keys(), ...after.keys()])].sort().map((key) => {
        const beforeMentionCount = before.get(key) ?? 0;
        const afterMentionCount = after.get(key) ?? 0;
        const change = afterMentionCount - beforeMentionCount;
        let direction = 'unchanged';
        if (change > 0) direction = 'increased';
        if (change < 0) direction = 'decreased';
        return {
            key,
            beforeMentionCount,
            afterMentionCount,
            change,
            direction,
        };
    });
};

const averageRating = (records) => {
    const ratings = records.map((record) => record.feedback?.rating).filter((rating) => Number.isFinite(rating));
    return ratings.length
        ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(2))
        : null;
};

const periodWarnings = (period, records) => {
    if (records.length === 0)
        return [{ code: 'NO_REVIEWS', period, message: `No reviews fell inside the ${period} release window.` }];
    if (records.length < 5)
        return [
            {
                code: 'LIMITED_DATA',
                period,
                reviewCount: records.length,
                message: `Only ${records.length} review(s) fell inside the ${period} release window.`,
            },
        ];
    return [];
};

export const buildReleaseImpactWindows = ({ releasedAt, daysBefore = 14, daysAfter = 14 }) => {
    const releaseTime = new Date(releasedAt).getTime();
    if (!Number.isFinite(releaseTime))
        throw new Error('GOOGLE_PLAY_INVALID_RELEASE: releasedAt must be an ISO date-time');
    return {
        before: {
            from: new Date(releaseTime - daysBefore * dayMs).toISOString(),
            to: new Date(releaseTime - 1).toISOString(),
            recentDays: null,
        },
        after: {
            from: new Date(releaseTime).toISOString(),
            to: new Date(releaseTime + daysAfter * dayMs - 1).toISOString(),
            recentDays: null,
        },
    };
};

export const compareGooglePlayReleaseImpact = ({
    product,
    release,
    beforeRecords,
    afterRecords,
    windows,
    generatedAt = new Date().toISOString(),
}) => {
    const coreReport = compareFeedbackWindows({ product, beforeRecords, afterRecords, windows, generatedAt });
    const beforeAverageRating = averageRating(beforeRecords);
    const afterAverageRating = averageRating(afterRecords);
    const issueChanges = changesFrom(
        successful(beforeRecords),
        successful(afterRecords),
        (record) => analysisOf(record).issue?.title,
    ).map(({ key, ...change }) => ({ title: key, ...change }));
    const featureRequestChanges = changesFrom(
        successful(beforeRecords),
        successful(afterRecords),
        (record) => analysisOf(record).featureRequest?.title,
    ).map(({ key, ...change }) => ({ title: key, ...change }));
    const countryChanges = changesFrom(
        beforeRecords,
        afterRecords,
        (record) => record.environmentContext?.countryCode,
    ).map(({ key, ...change }) => ({ countryCode: key, ...change }));
    const languageChanges = changesFrom(beforeRecords, afterRecords, (record) => record.feedback?.sourceLanguage).map(
        ({ key, ...change }) => ({ language: key, ...change }),
    );
    const versionChanges = changesFrom(
        beforeRecords,
        afterRecords,
        (record) => record.environmentContext?.appVersion,
    ).map(({ key, ...change }) => ({ version: key, ...change }));
    const compatibilityChanges = coreReport.topicChanges.filter((entry) => entry.topic === 'compatibility');
    const warnings = [...periodWarnings('before', beforeRecords), ...periodWarnings('after', afterRecords)];
    if (new Date(release.releasedAt).getTime() > new Date(generatedAt).getTime()) {
        warnings.push({
            code: 'FUTURE_RELEASE_DATE',
            message: 'The release timestamp is in the future relative to report generation.',
        });
    }

    return {
        recordType: 'feedbackImpactReport',
        product,
        release,
        windows,
        statistics: {
            ...coreReport.statistics,
            beforeAverageRating,
            afterAverageRating,
            ratingChange:
                beforeAverageRating !== null && afterAverageRating !== null
                    ? Number((afterAverageRating - beforeAverageRating).toFixed(2))
                    : null,
        },
        topicChanges: coreReport.topicChanges,
        issueChanges,
        newIssues: issueChanges.filter((entry) => entry.beforeMentionCount === 0 && entry.afterMentionCount > 0),
        increasingIssues: issueChanges.filter((entry) => entry.change > 0),
        decreasingIssues: issueChanges.filter((entry) => entry.change < 0),
        featureRequestChanges,
        newFeatureRequests: featureRequestChanges.filter(
            (entry) => entry.beforeMentionCount === 0 && entry.afterMentionCount > 0,
        ),
        improvedTopics: coreReport.improvedTopics,
        possibleRegressions: coreReport.possibleRegressions,
        compatibilityChanges,
        countryChanges,
        languageChanges,
        versionChanges,
        warnings,
        disclaimer:
            'Changes are observational comparisons of Google Play user feedback, not a causal confirmation that a release caused an issue or improvement.',
        generatedAt,
    };
};
