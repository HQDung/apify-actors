import { describe, expect, it } from 'vitest';

import { detectPatchCandidate, resolveComparisonBoundary } from '../src/domain/patch-detector.js';

const item = (title, content, overrides = {}) => ({
    id: title,
    title,
    content,
    publishedAt: '2026-07-30T23:58:15.000Z',
    url: 'https://steam.example/news',
    source: 'steam_news',
    isExternal: false,
    ...overrides,
});

describe('Steam patch detector', () => {
    it('accepts an obvious gameplay patch with a high confidence score', () => {
        const candidate = detectPatchCandidate([
            item('Gameplay Patch 7.41e', 'This patch fixes crashes, bugs, and balance issues.'),
        ]);
        expect(candidate).toMatchObject({ title: 'Gameplay Patch 7.41e', accepted: true, source: 'steam_news' });
        expect(candidate.confidence).toBeGreaterThanOrEqual(0.65);
        expect(candidate.signals).toEqual(
            expect.arrayContaining(['patch keyword', 'change/fix content', 'Steam announcement', 'version pattern']),
        );
    });

    it('accepts hotfix and major update titles', () => {
        expect(detectPatchCandidate([item('Hotfix 1.2', 'Fixes server and crash issues.')]).accepted).toBe(true);
        expect(detectPatchCandidate([item('Major Update', 'New content and balance changes.')]).accepted).toBe(true);
    });

    it('rejects sales and community events as silent patches', () => {
        expect(
            detectPatchCandidate([item('Summer Sale — 75% off', 'Save on the game.', { isExternal: false })]),
        ).toMatchObject({ accepted: false });
        expect(
            detectPatchCandidate([
                item('Tournament and Supporter Bundles', 'Predictions and rewards for the event.', {
                    isExternal: false,
                }),
            ]),
        ).toMatchObject({ accepted: false });
    });

    it('returns the best low-confidence candidate without accepting it', () => {
        const candidate = detectPatchCandidate([
            item('Developer Community News', 'A story about the community.', { isExternal: true }),
        ]);
        expect(candidate).toMatchObject({ accepted: false, title: 'Developer Community News' });
    });

    it('falls back to rolling periods when latest patch confidence is below threshold', () => {
        expect(
            resolveComparisonBoundary({
                input: { comparisonMode: 'latest_patch' },
                newsItems: [item('Summer Sale', 'Save now.')],
            }),
        ).toMatchObject({
            effectiveComparisonMode: 'recent_vs_previous',
            patch: expect.objectContaining({ accepted: false }),
            warnings: ['PATCH_DETECTION_FALLBACK'],
            patchBoundary: null,
        });
        expect(resolveComparisonBoundary({ input: { comparisonMode: 'recent_vs_previous' }, newsItems: [] })).toEqual({
            effectiveComparisonMode: 'recent_vs_previous',
            patch: null,
            patchBoundary: null,
            warnings: [],
        });
    });
});
