import { Actor } from 'apify';

import { runLeadScraper } from './lead-scraper.js';
import { nicheConfig } from './niche-config.js';

await Actor.init();

try {
    const input = (await Actor.getInput()) ?? {};
    await runLeadScraper({ input, config: nicheConfig });
} finally {
    await Actor.exit();
}
