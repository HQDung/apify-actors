import { log } from "apify";

import {
  cleanText,
  extractPlaceId,
  normalizeGoogleMapsUrl,
  normalizeUrl,
} from "../normalization/index.js";

const mapSearchUrl = (query) =>
  `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

export const discoverPlaceCards = async ({
  browser,
  createContext,
  searchJobs,
  maxPlacesPerJob,
}) => {
  const cards = [];
  for (const job of searchJobs) {
    const context = await createContext(browser);
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    const seenUrls = new Set();
    try {
      await page.goto(mapSearchUrl(job.query), {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForTimeout(3_000);
      let stalls = 0;
      while (seenUrls.size < maxPlacesPerJob && stalls < 4) {
        const found = await page.$$eval('a[href*="/maps/place"]', (links) =>
          links
            .map((link) => ({
              name: link.getAttribute("aria-label") || link.textContent,
              sourceUrl: link.href,
            }))
            .filter((item) => item.name && item.sourceUrl),
        );
        const before = seenUrls.size;
        for (const item of found) {
          const sourceUrl = normalizeGoogleMapsUrl(item.sourceUrl);
          if (!sourceUrl || seenUrls.has(sourceUrl)) continue;
          seenUrls.add(sourceUrl);
          cards.push({
            name: cleanText(item.name),
            sourceUrl,
            canonicalUrl: sourceUrl,
            placeId: extractPlaceId(sourceUrl),
            matchedKeywords: [job.keyword],
          });
          if (seenUrls.size >= maxPlacesPerJob) break;
        }
        stalls = before === seenUrls.size ? stalls + 1 : 0;
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
      log.info(
        `Search job "${job.keyword}" in ${job.location}: ${seenUrls.size} place cards.`,
      );
    } catch (error) {
      log.warning(
        `Discovery failed for ${job.keyword} in ${job.location}: ${error.message}`,
      );
    } finally {
      await context.close();
    }
  }
  return cards;
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
          .map((element) => element.getAttribute("aria-label"))
          .find((value) => value?.startsWith(prefix))
          ?.slice(prefix.length)
          .trim() ?? null;
      const links = Array.from(document.querySelectorAll("a"));
      const website =
        links.find((link) =>
          /website/i.test(link.getAttribute("aria-label") ?? ""),
        )?.href ?? null;
      const ratingText = Array.from(document.querySelectorAll("[aria-label]"))
        .map((element) => element.getAttribute("aria-label"))
        .find((value) => /^\d([.,]\d)? stars/i.test(value ?? ""));
      return {
        name: text(document.querySelector("h1")?.textContent),
        address: aria("Address:"),
        phone: aria("Phone:"),
        website,
        rating: ratingText
          ? Number(ratingText.match(/[\d.,]+/)?.[0]?.replace(",", "."))
          : null,
      };
    });
    return {
      ...place,
      ...data,
      website: normalizeUrl(data.website),
      sourceUrl: normalizeGoogleMapsUrl(place.sourceUrl) ?? place.sourceUrl,
      canonicalUrl:
        normalizeGoogleMapsUrl(place.canonicalUrl ?? place.sourceUrl) ??
        place.canonicalUrl ??
        place.sourceUrl,
      placeId: place.placeId ?? extractPlaceId(place.sourceUrl),
    };
  } finally {
    await context.close();
  }
};
