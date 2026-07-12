import { Actor, log } from 'apify';
import { chromium } from 'playwright';

await Actor.init();

const input = (await Actor.getInput()) ?? {};



const searchType = String(input.keyword ?? 'restaurant').trim();
const searchLocation = String(input.location ?? 'Ho Chi Minh').trim();
const searchTypes = [searchType];
const maxResults = Number(input.maxResults ?? 20);
const searchQueryTemplate = "{type} {location}";

const batchSize = Number(input.batchSize ?? 5);
const extractEmails = Boolean(input.extractEmails ?? true);
const useApifyProxy = Boolean(input.useProxy ?? input.useApifyProxy ?? false);



if (!searchType) throw new Error('Input "keyword" is required.');
if (!searchLocation) throw new Error('Input "location" is required.');
if (!Number.isInteger(maxResults) || maxResults <= 0) {
    throw new Error('Input "maxResults" must be a positive integer.');
}


const randomDelay = async (min = 500, max = 1500) => {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, ms));
};

const extractEmailsFromText = (text) => {
    const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];

    return [...new Set(matches)]
        .map((email) => email.toLowerCase())
        .filter((email) => {
            return !email.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)
                && !email.includes('example.com')
                && !email.includes('yourdomain.com')
                && !email.includes('domain.com');
        });
};

const retry = async (fn, retries = 2) => {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < retries) await randomDelay(1000, 2500);
        }
    }

    throw lastError;
};

const getLeadScore = (item) => {
    let score = 0;

    if (item.email) score += 40;
    if (item.website) score += 20;
    if (item.phone) score += 15;
    if (Number(item.rating) >= 4) score += 10;
    if (item.address) score += 5;
    if (item.googleMapsUrl) score += 5;

    return Math.min(score, 100);
};

const getLeadQuality = (score) => {
    if (score >= 75) return 'high';
    if (score >= 45) return 'medium';

    return 'low';
};

const getDedupeKey = (item) => {
    if (item.googleMapsUrl) return `url:${item.googleMapsUrl}`;
    if (item.name && item.address) {
        return `name-address:${item.name.toLowerCase()}|${item.address.toLowerCase()}`;
    }

    return null;
};

const getSearchQuery = (type) => {
    return searchQueryTemplate
        .replaceAll('{type}', type)
        .replaceAll('{keyword}', type)
        .replaceAll('{location}', searchLocation)
        .replaceAll('{city}', searchLocation);
};

const proxyConfiguration = useApifyProxy
    ? await Actor.createProxyConfiguration()
    : null;

const browser = await chromium.launch({
    headless: true,
});

const createPage = async () => {
    const contextOptions = {};

    if (proxyConfiguration) {
        const proxyUrl = await proxyConfiguration.newUrl();
        contextOptions.proxy = { server: proxyUrl };
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    page.setDefaultTimeout(30000);

    return { context, page };
};

const collectPlacesForSearchType = async (type) => {
    const { context: searchContext, page } = await createPage();
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(getSearchQuery(type))}`;
    const seen = new Map();
    let noNewCount = 0;

    try {
        await page.goto(searchUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });

        await page.waitForTimeout(5000);

        while (seen.size < maxResults && noNewCount < 5) {
            const places = await page.$$eval('a[href*="/maps/place"]', (links) => {
                return links
                    .map((a) => ({
                        name: a.getAttribute('aria-label') || a.textContent?.trim(),
                        url: a.href,
                    }))
                    .filter((place) => place.name && place.url);
            });

            let newItems = 0;

            for (const place of places) {
                if (!seen.has(place.url) && seen.size < maxResults) {
                    seen.set(place.url, { ...place, searchType: type });
                    newItems++;
                }
            }

            noNewCount = newItems === 0 ? noNewCount + 1 : 0;

            const feed = page.locator('div[role="feed"]').first();

            try {
                await feed.evaluate((el) => {
                    el.scrollTop = el.scrollHeight;
                });
            } catch {
                break;
            }

            await page.waitForTimeout(3000);
        }
    } finally {
        await searchContext.close();
    }

    return Array.from(seen.values());
};

const placesByUrl = new Map();

for (const type of searchTypes) {
    const places = await collectPlacesForSearchType(type);

    for (const place of places) {
        if (!placesByUrl.has(place.url)) {
            placesByUrl.set(place.url, place);
        }
    }
}

const placesToExtract = Array.from(placesByUrl.values());
const pushedKeys = new Set();

const extractEmailFromWebsite = async (website) => {
    if (!website) return { emails: [], email: null };

    const blockedDomains = [
        'facebook.com',
        'instagram.com',
        'youtube.com',
        'tiktok.com',
        'zalo.me',
        'google.com',
    ];

    if (blockedDomains.some((domain) => website.includes(domain))) {
        return { emails: [], email: null };
    }

    const { context, page: websitePage } = await createPage();

    try {
        await retry(async () => {
            await websitePage.goto(website, {
                waitUntil: 'domcontentloaded',
                timeout: 20000,
            });
        }, 1);

        await websitePage.waitForTimeout(1500);

        const content = await websitePage.content();

        const mailtoEmails = await websitePage.$$eval('a[href^="mailto:"]', (links) => {
            return links
                .map((a) => a.href.replace(/^mailto:/i, '').split('?')[0])
                .filter(Boolean);
        });

        const htmlEmails = extractEmailsFromText(content);
        const emails = [...new Set([...mailtoEmails, ...htmlEmails])];

        return {
            emails,
            email: emails[0] ?? null,
        };
    } catch (err) {
        log.warning(`Email extraction failed for ${website}: ${err.message}`);
        return {
            emails: [],
            email: null,
            emailError: err.message,
        };
    } finally {
        await context.close();
    }
};

const pushDedupedItem = async (item) => {
    const leadScore = getLeadScore(item);
    const output = {
        ...item,
        hasEmail: Boolean(item.email),
        leadScore,
        leadQuality: getLeadQuality(leadScore),
    };
    const dedupeKey = getDedupeKey(output);

    if (!dedupeKey || !pushedKeys.has(dedupeKey)) {
        if (dedupeKey) pushedKeys.add(dedupeKey);
        await Actor.pushData(output);
    }
};

const extractPlace = async (place) => {
    const { context, page: detailPage } = await createPage();

    try {
        await retry(async () => {
            await detailPage.goto(place.url, {
                waitUntil: 'domcontentloaded',
                timeout: 60000,
            });
        }, 2);

        await detailPage.waitForTimeout(4000);
        await randomDelay();

        const data = await detailPage.evaluate(() => {
            const cleanText = (value) => value?.replace(/\s+/g, ' ').trim() || null;

            const getText = (selector) => {
                const el = document.querySelector(selector);
                return cleanText(el?.textContent);
            };

            const getAriaValue = (prefix) => {
                const elements = Array.from(document.querySelectorAll('button, a'));

                return elements
                    .map((el) => el.getAttribute('aria-label'))
                    .find((text) => text?.startsWith(prefix))
                    ?.replace(prefix, '')
                    .trim() ?? null;
            };

            const name = getText('h1');

            const address = getAriaValue('Address:');
            const phone = getAriaValue('Phone:');

            const website =
                Array.from(document.querySelectorAll('a'))
                    .find((a) => a.getAttribute('aria-label')?.includes('Website'))
                    ?.href ?? null;

            const category =
                cleanText(document.querySelector('button[jsaction*="category"]')?.textContent) ??
                null;

            const ratingText = Array.from(document.querySelectorAll('[aria-label]'))
                .map((el) => el.getAttribute('aria-label'))
                .find((text) => text && /^[0-9.]+\s*stars/i.test(text.trim()));

            const rating = ratingText?.match(/[0-9.]+/)?.[0] ?? null;

            return {
                name,
                rating,
                category,
                address,
                website,
                phone,
            };
        });

        const emailData = extractEmails
            ? await extractEmailFromWebsite(data.website)
            : { emails: [], email: null };

        await pushDedupedItem({
            keyword: place.searchType,
            location: searchLocation,
            name: data.name || place.name,
            rating: data.rating,
            category: data.category,
            address: data.address,
            website: data.website,
            phone: data.phone,
            email: emailData.email,
            emails: emailData.emails,
            googleMapsUrl: place.url,
        });
    } catch (err) {
        log.warning(`Failed to extract ${place.url}: ${err.message}`);

        await pushDedupedItem({
            keyword: place.searchType,
            location: searchLocation,
            name: place.name,
            rating: null,
            category: null,
            address: null,
            website: null,
            phone: null,
            email: null,
            emails: [],
            googleMapsUrl: place.url,
            error: err.message,
        });
    } finally {
        await context.close();
    }
};

for (let i = 0; i < placesToExtract.length; i += batchSize) {
    const batch = placesToExtract.slice(i, i + batchSize);
    await Promise.all(batch.map((place) => extractPlace(place)));
}

await browser.close();
await Actor.exit();
