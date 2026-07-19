import { log } from "apify";

import { extractWebsiteData } from "./extract.js";
import { selectPages } from "./select-pages.js";

export const enrichVenue = async ({
  browser,
  createContext,
  website,
  maximumPages,
  preserveOriginalText,
}) => {
  if (!website)
    return {
      data: null,
      status: "no_source_available",
      pagesCrawled: 0,
      warnings: ["Official website could not be identified."],
    };
  const context = await createContext(browser);
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  try {
    await page.goto(website, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    const links = await page.$$eval("a[href]", (items) =>
      items.map((item) => ({
        url: item.href,
        text: item.textContent?.trim() ?? "",
      })),
    );
    const selected = selectPages({
      homepage: website,
      links,
      maximum: maximumPages,
    });
    const pages = [];
    for (const url of selected) {
      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        pages.push({
          url,
          text: await page.locator("body").innerText(),
          links: await page.$$eval("a[href]", (items) =>
            items.map((item) => ({
              url: item.href,
              text: item.textContent?.trim() ?? "",
            })),
          ),
        });
      } catch (error) {
        log.warning(`Website page skipped: ${url} (${error.message})`);
      }
    }
    if (!pages.length)
      return {
        data: null,
        status: "failed",
        pagesCrawled: 0,
        warnings: ["Official website could not be crawled."],
      };
    return {
      data: extractWebsiteData({ pages, preserveOriginalText }),
      status: pages.length === selected.length ? "completed" : "partial",
      pagesCrawled: pages.length,
      warnings: [],
    };
  } catch (error) {
    return {
      data: null,
      status: "failed",
      pagesCrawled: 0,
      warnings: [`Official website enrichment failed: ${error.message}`],
    };
  } finally {
    await context.close();
  }
};
