import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateMatchConfidence } from '../src/identity/calculate-match-confidence.js';

const benchmarkCases = [
    ['One Piece', 'One Piece', null],
    ['Dandadan', 'Dandadan', null],
    ['Spy x Family', 'Spy × Family', null],
    ['Jujutsu Kaisen', 'Jujutsu Kaisen', null],
    ['Demon Slayer Kimetsu no Yaiba', 'Demon Slayer: Kimetsu no Yaiba', null],
    ['Naruto', 'Naruto', null],
    ['One-Punch Man', 'One Punch-Man', null],
    ['Đảo Hải Tặc', 'One Piece', [{ title: 'Đảo Hải Tặc', languageCode: 'vi' }]],
    ['Đôrêmon', 'Doraemon', [{ title: 'Đôrêmon', languageCode: 'vi' }]],
    ['Thám Tử Lừng Danh Conan', 'Detective Conan', [{ title: 'Thám Tử Lừng Danh Conan', languageCode: 'vi' }]],
];

test('Phase 2 benchmark set reaches at least 90% confident work matching', () => {
    const results = benchmarkCases.map(([query, canonicalTitle, aliases]) =>
        calculateMatchConfidence(query, { canonicalTitle, nativeTitle: null, aliases: aliases ?? [] }),
    );
    const matched = results.filter((result) => result.status === 'matched').length;
    assert.ok(matched / benchmarkCases.length >= 0.9);
    assert.ok(results.every((result) => result.confidence >= 0.95));
});

test('low-confidence candidates remain ambiguous', () => {
    const result = calculateMatchConfidence('Dragon Ball', {
        canonicalTitle: 'The Seven Beauties Are My Martial Sisters',
        nativeTitle: null,
        aliases: [],
    });
    assert.equal(result.status, 'ambiguous');
    assert.ok(result.confidence < 0.7);
});
