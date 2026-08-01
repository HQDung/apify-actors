import assert from 'node:assert/strict';
import { test } from 'node:test';

import { analyzeGooglePlayFeedback, GOOGLE_PLAY_TAXONOMY } from '../src/analysis/google-play-analysis.js';

const feedback = {
    source: {
        platform: 'google-play',
        sourceRecordId: 'review-1',
        sourceUrl: null,
        collectedAt: '2026-08-01T00:00:00.000Z',
    },
    product: { productType: 'app', productId: 'com.todoist', name: null, version: null },
    feedback: {
        text: 'The app loses my reminders after an update.',
        title: null,
        sourceLanguage: 'en',
        createdAt: null,
        updatedAt: null,
        isPositive: false,
        rating: 2,
    },
};

test('uses the shared deterministic fallback for Google Play feedback', () => {
    const result = analyzeGooglePlayFeedback({ feedback });
    assert.equal(result.analysisStatus, 'success');
    assert.equal(result.sentiment, 'negative');
    assert.equal(result.modelMetadata.provider, 'deterministic-fallback');
    assert.equal(GOOGLE_PLAY_TAXONOMY.feedbackTypes.includes(result.primaryFeedbackType), true);
});

test('passes Google Play normalized feedback and output language to an injected provider', async () => {
    let captured;
    const result = await analyzeGooglePlayFeedback({
        feedback,
        options: { outputLanguage: 'vietnamese', maxAttempts: 1 },
        provider: async ({ feedback: providerFeedback, options }) => {
            captured = { text: providerFeedback.feedback.text, outputLanguage: options.outputLanguage };
            return {
                isActionableFeedback: true,
                actionabilityScore: 0.8,
                primaryFeedbackType: 'bugReport',
                feedbackTypes: ['bugReport'],
                sentiment: 'negative',
                severity: 'medium',
                topics: ['dataLoss'],
                summary: 'The user reports lost reminders.',
                issue: null,
                featureRequest: null,
                positiveSignals: [],
                sourceLanguage: 'en',
                analysisLanguage: 'vietnamese',
                originalTextPreserved: true,
                modelMetadata: { provider: 'test', model: 'test', schemaVersion: '1.0' },
            };
        },
    });

    assert.equal(result.analysisStatus, 'success');
    assert.deepEqual(captured, { text: feedback.feedback.text, outputLanguage: 'vietnamese' });
    assert.equal(result.analysisLanguage, 'vietnamese');
});
