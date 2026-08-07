import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

describe('Actor packaging', () => {
    it('installs the vendored shared core in the production image and starts the Actor', () => {
        const dockerfile = read('Dockerfile');
        const packageJson = JSON.parse(read('package.json'));
        expect(dockerfile).toContain('COPY --chown=myuser:myuser vendor ./vendor');
        expect(dockerfile).toContain('npm install --omit=dev --omit=optional');
        expect(dockerfile).toContain('CMD ["node", "src/main.js"]');
        expect(packageJson.dependencies['@project/feedback-analysis-core']).toMatch(/^file:vendor\//);
    });

    it('does not add browser, credential, or external-model runtime requirements', () => {
        const packageJson = JSON.parse(read('package.json'));
        const dependencies = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies }).join(' ');
        expect(dependencies).not.toMatch(/playwright|puppeteer|openai|reddit|discord/i);
        expect(read('src/main.js')).not.toMatch(/OPENAI|API_KEY|PROXY|SECRET/i);
    });
});
