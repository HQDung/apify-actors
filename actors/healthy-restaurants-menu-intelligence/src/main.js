import { Actor, log } from "apify";
import { chromium } from "playwright";

import { mapInBatches } from "./concurrency.js";
import {
  discoverPlaceCards,
  extractPlaceDetails,
} from "./discovery/google-maps.js";
import {
  buildSearchJobs,
  deduplicateRestaurants,
  normalizeRestaurantCandidate,
  restaurantIdFor,
} from "./discovery/restaurants.js";
import { isRestaurantOutput, validateInput } from "./schemas/validators.js";
import {
  crawlRestaurantWebsite,
  emptyMenu,
} from "./website/crawl-restaurant-website.js";

const browserBatchSize = 4;
const websiteBatchSize = 3;

await Actor.init();

let browser;
let exitCode = 0;
let statusMessage;

try {
  const input = validateInput((await Actor.getInput()) ?? {});
  const searchJobs = buildSearchJobs(input);
  log.info(
    `Starting restaurant discovery in ${input.location} with ${searchJobs.length} search jobs.`,
  );

  browser = await chromium.launch({ headless: true });
  const cards = await discoverPlaceCards({
    browser,
    createContext: async (instance) => instance.newContext(),
    searchJobs,
    maxPlacesPerJob: input.maxRestaurants,
  });

  let detailFailures = 0;
  const detailed = await mapInBatches(cards, browserBatchSize, async (card) => {
    try {
      return await extractPlaceDetails({
        browser,
        createContext: async (instance) => instance.newContext(),
        place: card,
      });
    } catch (error) {
      detailFailures++;
      log.warning(
        `Place detail skipped for ${card.sourceUrl}: ${error.message}`,
      );
      return {
        ...card,
        warning: {
          code: "DISCOVERY_DETAIL_FAILED",
          message: error.message,
          sourceUrl: card.sourceUrl,
        },
      };
    }
  });

  const normalized = detailed.map((candidate) => {
    const record = normalizeRestaurantCandidate(candidate, input.location);
    record.restaurantId = restaurantIdFor(record);
    if (candidate.warning) record.warnings = [candidate.warning];
    return record;
  });
  const restaurants = deduplicateRestaurants(normalized, input.maxRestaurants);

  const enriched = await mapInBatches(
    restaurants,
    websiteBatchSize,
    async (restaurant) => {
      if (!input.includeMenu) return restaurant;
      if (!restaurant.contact.website) {
        return {
          ...restaurant,
          menu: emptyMenu("website_missing"),
          warnings: [
            ...restaurant.warnings,
            {
              code: "WEBSITE_MISSING",
              message:
                "No official restaurant website was found in place details.",
            },
          ],
        };
      }
      try {
        const website = await crawlRestaurantWebsite({
          website: restaurant.contact.website,
          maximumMenuPages: input.maxMenuPagesPerRestaurant,
        });
        return {
          ...restaurant,
          contact: {
            ...restaurant.contact,
            website: website.finalUrl ?? website.requestedUrl,
          },
          menu: website.menu,
          warnings: [...restaurant.warnings, ...website.warnings],
          errors: [...restaurant.errors, ...website.errors],
        };
      } catch (error) {
        return {
          ...restaurant,
          menu: emptyMenu("website_unreachable"),
          errors: [
            ...restaurant.errors,
            {
              code: "WEBSITE_UNREACHABLE",
              message: error instanceof Error ? error.message : String(error),
              sourceUrl: restaurant.contact.website,
            },
          ],
        };
      }
    },
  );

  for (const restaurant of enriched) {
    if (!isRestaurantOutput(restaurant))
      throw new Error(
        `Discovery produced an invalid restaurant record: ${restaurant.restaurantName}`,
      );
    await Actor.pushData(restaurant);
  }

  const websitesAvailable = enriched.filter(
    (restaurant) => restaurant.contact.website,
  ).length;
  const menuStatusCounts = Object.fromEntries(
    [...new Set(enriched.map((restaurant) => restaurant.menu.status))].map(
      (status) => [
        status,
        enriched.filter((restaurant) => restaurant.menu.status === status)
          .length,
      ],
    ),
  );
  log.info(
    `Restaurants discovered: ${cards.length}; after deduplication: ${enriched.length}; websites available: ${websitesAvailable}; detail failures: ${detailFailures}; menu statuses: ${JSON.stringify(menuStatusCounts)}.`,
  );
  if (input.includeMenu) {
    log.info(
      "Phase 3 crawled official homepages only; menu contents were not fetched or parsed.",
    );
  } else {
    log.info("includeMenu is false; no restaurant websites were crawled.");
  }
} catch (error) {
  const exception = error instanceof Error ? error : new Error(String(error));
  exitCode = 1;
  statusMessage = `Phase 3 website enrichment failed: ${exception.message}`;
  log.exception(exception, "Healthy Restaurants Phase 3 run failed.");
} finally {
  await browser?.close();
  await Actor.exit({ exitCode, statusMessage });
}
