import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    COMPARISON_CLASSIFICATIONS,
    PLATFORM_IDS,
    createComparisonId,
    validateCrossPlatformComparison,
    validateCrossPlatformFeedbackReport,
    validateProductMapping,
    validateSharedIssue,
    validatePlatformSpecificIssue,
} from '../src/index.js';

const product = {
    productId: 'example-product',
    name: 'Example App',
    productType: 'mobileApp',
    platforms: {
        googlePlay: { appId: 'com.example.app', storeUrl: 'https://play.google.com/store/apps/details?id=com.example.app' },
        appleAppStore: { appId: '123456789', storeUrl: 'https://apps.apple.com/us/app/example/id123456789' },
    },
};

test('exposes canonical platform IDs and comparison classifications', () => {
    assert.deepEqual(PLATFORM_IDS, ['googlePlay', 'appleAppStore']);
    assert.deepEqual(COMPARISON_CLASSIFICATIONS, ['shared', 'androidOnly', 'iosOnly', 'platformDominantAndroid', 'platformDominantIos', 'insufficientEvidence']);
});

test('accepts explicit product identity with one or both platforms', () => {
    assert.deepEqual(validateProductMapping(product, { requireBothPlatforms: true }), product);
    assert.equal(validateProductMapping({ ...product, platforms: { googlePlay: product.platforms.googlePlay } }).platforms.appleAppStore, undefined);
    assert.throws(() => validateProductMapping({ productId: 'missing-platforms', platforms: {} }), /INVALID_PRODUCT_MAPPING/);
    assert.throws(() => validateProductMapping({ ...product, productId: 'bad id' }), /INVALID_PRODUCT_MAPPING/);
});

test('creates deterministic comparison IDs from product and canonical issue identity', () => {
    assert.equal(createComparisonId({ productId: 'example-product', classification: 'shared', canonicalIssue: 'Crash during login' }), 'example-product-shared-crash-during-login');
    assert.equal(createComparisonId({ productId: 'example product', classification: 'shared', canonicalIssue: 'Crash / login' }), 'example-product-shared-crash-login');
});

test('requires evidence from both platforms for a shared issue', () => {
    const shared = validateSharedIssue({
        comparisonId: 'example-product-shared-crash-during-login',
        classification: 'shared',
        canonicalIssue: 'Crash during login',
        feedbackType: 'bugReport',
        topics: ['crash', 'login'],
        severity: 'high',
        androidClusterId: 'gp-login-crash',
        iosClusterId: 'ios-login-crash',
        androidMentions: 82,
        iosMentions: 61,
        sharedConfidence: 0.91,
        reasons: ['matching feedback type', 'shared crash and login topics'],
        warnings: [],
    });
    assert.equal(shared.classification, 'shared');
    assert.throws(() => validateSharedIssue({ ...shared, iosClusterId: null }), /INSUFFICIENT_CROSS_PLATFORM_DATA/);
});

test('requires cautious sample wording for a platform-specific issue', () => {
    const issue = validatePlatformSpecificIssue({
        comparisonId: 'example-product-android-only-background-battery-drain',
        classification: 'androidOnly',
        platform: 'android',
        canonicalIssue: 'Excessive battery drain in background',
        feedbackType: 'performanceIssue',
        topics: ['batteryDrain'],
        mentionCount: 47,
        severity: 'high',
        comparisonConfidence: 0.86,
        observedOnlyInCollectedSample: true,
        evidenceStatus: 'sufficient',
        warnings: [],
    });
    assert.equal(issue.observedOnlyInCollectedSample, true);
    assert.throws(() => validatePlatformSpecificIssue({ ...issue, observedOnlyInCollectedSample: false }), /INSUFFICIENT_CROSS_PLATFORM_DATA/);
});

test('accepts a partial report only when the missing platform is disclosed', () => {
    const report = validateCrossPlatformFeedbackReport({
        recordType: 'crossPlatformFeedbackReport',
        product,
        reviewWindow: { from: '2026-07-01T00:00:00.000Z', to: '2026-07-31T23:59:59.999Z' },
        statistics: {
            googlePlayReviewsCollected: 1000,
            appleAppStoreReviewsCollected: 0,
            googlePlayAverageRating: 3.7,
            appleAppStoreAverageRating: null,
            googlePlayActionableReviews: 410,
            appleAppStoreActionableReviews: 0,
        },
        sharedIssues: [],
        androidOnlyIssues: [],
        iosOnlyIssues: [],
        sharedFeatureRequests: [],
        platformDifferences: { androidMoreNegativeTopics: [], iosMoreNegativeTopics: [] },
        countryInsights: [],
        languageInsights: [],
        versionInsights: [],
        warnings: [{ code: 'INSUFFICIENT_CROSS_PLATFORM_DATA', platform: 'ios', message: 'No iOS reviews were collected.' }],
        generatedAt: '2026-08-01T00:00:00.000Z',
    });
    assert.equal(report.statistics.appleAppStoreReviewsCollected, 0);
    assert.throws(() => validateCrossPlatformFeedbackReport({ ...report, warnings: [] }), /INSUFFICIENT_CROSS_PLATFORM_DATA/);
});

test('validates comparison records against the source-neutral product identity', () => {
    const comparison = validateCrossPlatformComparison({
        recordType: 'crossPlatformComparison',
        product,
        comparisonId: 'example-product-shared-crash-during-login',
        classification: 'shared',
        canonicalIssue: 'Crash during login',
        feedbackType: 'bugReport',
        topics: ['crash', 'login'],
        severity: 'high',
        androidClusterId: 'gp-login-crash',
        iosClusterId: 'ios-login-crash',
        androidMentions: 82,
        iosMentions: 61,
        sharedConfidence: 0.91,
        reasons: ['matching feedback type'],
        warnings: [],
    });
    assert.equal(comparison.product.productId, 'example-product');
    assert.throws(() => validateCrossPlatformComparison({ ...comparison, classification: 'iosOnly', iosClusterId: null }), /INVALID_CROSS_PLATFORM_COMPARISON/);
});
