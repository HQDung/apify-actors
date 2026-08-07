import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const json = (file) => JSON.parse(read(file));

describe('publish readiness contracts', () => {
    it('keeps input defaults and safety bounds aligned across schema and sample input', () => {
        const schema = json('.actor/input_schema.json');
        const sample = json('sample-input.json');
        expect(schema.schemaVersion).toBe(1);
        expect(schema.properties.steamAppIds).toMatchObject({ default: ['646570'], minItems: 1, maxItems: 10 });
        expect(schema.properties.windowDays).toMatchObject({ default: 7, minimum: 1, maximum: 30 });
        expect(schema.properties.maxReviewsPerPeriod).toMatchObject({ default: 40, minimum: 10, maximum: 250 });
        expect(sample).toMatchObject({
            steamAppIds: ['646570'],
            comparisonMode: 'recent_vs_previous',
            windowDays: 7,
            maxReviewsPerPeriod: 40,
            language: 'english',
            includeOffTopicReviews: false,
            includeEvidence: true,
        });
        expect(json('storage/key_value_stores/default/INPUT.json')).toEqual(sample);
    });

    it('exposes final report fields and run statistics through Actor schemas', () => {
        const actor = json('.actor/actor.json');
        const dataset = json('.actor/dataset_schema.json');
        const output = json('.actor/output_schema.json');
        const { fields } = dataset.views.overview.transformation;
        expect(actor).toMatchObject({
            actorSpecification: 1,
            name: 'game-patch-impact-player-sentiment',
            version: '0.1',
            memoryMbytes: 256,
            meta: { generatedBy: 'Codex with GPT-5' },
        });
        expect(fields).toEqual(
            expect.arrayContaining([
                'comparison.before.positiveRate',
                'comparison.after.positiveRate',
                'impact.confidence',
                'newIssues',
                'regressions',
                'improvements',
                'featureRequests',
                'warnings',
                'stats.durationMs',
            ]),
        );
        expect(output.properties).toEqual(
            expect.objectContaining({ dataset: expect.any(Object), runStatistics: expect.any(Object) }),
        );
        expect(output.properties.runStatistics.template).toMatch(/RUN_STATS$/);
    });

    it('documents observational limits, API usage, and unchanged pricing guidance', () => {
        const readme = read('README.md');
        expect(readme).toMatch(/does not claim that a patch caused/i);
        expect(readme).toMatch(/API/i);
        expect(readme).toMatch(/pricing/i);
        expect(readme).toMatch(/does not change pricing automatically/i);
    });
});
