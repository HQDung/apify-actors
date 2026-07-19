import { log } from "apify";

import { cleanText, normalizeUrl } from "../normalization/index.js";

export const discoverPlaces = async ({
  browser,
  createContext,
  location,
  terms,
  maxPlaces,
}) => {
  const results = new Map();
  for (const term of terms) {
    if (results.size >= maxPlaces) break;
    const context = await createContext(browser);
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    try {
      await page.goto(
        `https://www.google.com/maps/search/${encodeURIComponent(`${term} ${location.query}`)}`,
        { waitUntil: "domcontentloaded", timeout: 60_000 },
      );
      await page.waitForTimeout(3_000);
      let stalls = 0;
      while (results.size < maxPlaces && stalls < 4) {
        const cards = await page.$$eval('a[href*="/maps/place"]', (links) =>
          links
            .map((link) => ({
              name: link.getAttribute("aria-label") || link.textContent,
              sourceUrl: link.href,
            }))
            .filter((item) => item.name && item.sourceUrl),
        );
        const before = results.size;
        for (const item of cards) {
          const { sourceUrl } = item;
          const previous = results.get(sourceUrl);
          if (!previous && results.size >= maxPlaces) break;
          results.set(sourceUrl, {
            ...previous,
            ...item,
            name: cleanText(item.name),
            sourceUrl,
            searchVenueTypes: [
              ...new Set([...(previous?.searchVenueTypes ?? []), term]),
            ],
          });
        }
        stalls = before === results.size ? stalls + 1 : 0;
        try {
          await page
            .locator('div[role="feed"]')
            .first()
            .evaluate((element) => element.scrollTo(0, element.scrollHeight));
        } catch {
          break;
        }
        await page.waitForTimeout(1_500);
      }
    } catch (error) {
      log.warning(
        `Discovery failed for ${term} in ${location.query}: ${error.message}`,
      );
    } finally {
      await context.close();
    }
  }
  return [...results.values()];
};

export const extractPlaceDetails = async ({
  browser,
  createContext,
  place,
}) => {
  const context = await createContext(browser);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  try {
    await page.goto(place.sourceUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(2_500);
    const data = await page.evaluate(() => {
      const text = (value) => value?.replace(/\s+/g, " ").trim() || null;
      const aria = (prefix) =>
        Array.from(document.querySelectorAll("[aria-label]"))
          .map((el) => el.getAttribute("aria-label"))
          .find((value) => value?.startsWith(prefix))
          ?.slice(prefix.length)
          .trim() ?? null;
      const links = Array.from(document.querySelectorAll("a"));
      const website =
        links.find((a) => /website/i.test(a.getAttribute("aria-label") ?? ""))
          ?.href ?? null;
      const rating =
        Array.from(document.querySelectorAll("[aria-label]"))
          .map((el) => el.getAttribute("aria-label"))
          .find((value) => /^\d([.,]\d)? stars/i.test(value ?? ""))
          ?.match(/[\d.,]+/)?.[0]
          ?.replace(",", ".") ?? null;
      return {
        name: text(document.querySelector("h1")?.textContent),
        address: aria("Address:"),
        phone: aria("Phone:"),
        website,
        rating: rating ? Number(rating) : null,
        category: text(
          document.querySelector('button[jsaction*="category"]')?.textContent,
        ),
      };
    });
    return { ...place, ...data, website: normalizeUrl(data.website) };
  } finally {
    await context.close();
  }
};
