import { Actor, log } from "apify";
import { chromium } from "playwright";

import { classifyHealthyPositioning } from "./classification/healthy-positioning.js";
import { mapInBatches } from "./concurrency.js";
import { aggregateDietaryOptions } from "./dietary/extraction.js";
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
import { deduplicateMenuItems } from "./menu/extraction.js";
import {
  processMenuPage,
  selectHtmlMenuCandidates,
} from "./menu/process-menu-page.js";
import { DEFAULT_RUNTIME_POLICY } from "./runtime/reliability.js";
import { createRunStatistics } from "./runtime/run-statistics.js";
import {
  isRestaurantOutput,
  outputValidationIssues,
  validateInput,
} from "./schemas/validators.js";
import {
  crawlRestaurantWebsite,
  emptyMenu,
} from "./website/crawl-restaurant-website.js";

const browserBatchSize = DEFAULT_RUNTIME_POLICY.browserConcurrency;
const websiteBatchSize = DEFAULT_RUNTIME_POLICY.websiteConcurrency;

await Actor.init();

let browser;
let exitCode = 0;
let statusMessage;
const statistics = createRunStatistics();

try {
  const input = validateInput((await Actor.getInput()) ?? {});
  const searchJobs = buildSearchJobs(input);
  statistics.set("searchJobs", searchJobs.length);
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
  statistics.set("rawPlacesDiscovered", cards.length);

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
          code: "DISCOVERY_FAILED",
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
  statistics.set("restaurantsAfterDeduplication", restaurants.length);

  let menuPagesCrawled = 0;
  let rawMenuItems = 0;
  let deduplicatedMenuItems = 0;
  let emptyMenus = 0;
  let menuPageFailures = 0;

  const enriched = await mapInBatches(
    restaurants,
    websiteBatchSize,
    async (restaurant) => {
      const keywordOnlyPositioning = classifyHealthyPositioning({
        matchedKeywords: restaurant.matchedKeywords,
        sourceUrl: restaurant.contact.website,
      });
      if (!input.includeMenu)
        return {
          ...restaurant,
          healthyPositioning: keywordOnlyPositioning,
        };
      if (!restaurant.contact.website) {
        return {
          ...restaurant,
          healthyPositioning: keywordOnlyPositioning,
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
        const { menu: websiteMenu } = website;
        if (website.finalUrl) statistics.increment("websitesReachable");
        let menu = websiteMenu;
        const pageWarnings = [];
        const pageErrors = [];
        const pageResults = [];
        const htmlCandidates = selectHtmlMenuCandidates(
          website.menu.menuCandidates,
          input.maxMenuPagesPerRestaurant,
        );
        if (htmlCandidates.length) {
          for (const candidate of htmlCandidates) {
            const page = await processMenuPage({
              candidate,
              maxItems: input.maxMenuItemsPerRestaurant,
              defaultCurrency:
                restaurant.location.countryCode === "GB" ? "GBP" : null,
            });
            menuPagesCrawled++;
            statistics.increment("htmlMenusProcessed");
            rawMenuItems += page.rawItemsFound;
            statistics.increment("rawMenuItems", page.rawItemsFound);
            pageResults.push(page);
            pageWarnings.push(...page.warnings);
            pageErrors.push(...page.errors);
            if (page.status === "extraction_failed") menuPageFailures++;
            if (page.status === "extracted")
              statistics.increment("menusExtracted");
            if (page.status === "extracted_empty")
              statistics.increment("menusExtractedEmpty");
            if (page.status === "unsupported_format")
              statistics.increment("unsupportedMenus");
            if (page.status === "extraction_failed")
              statistics.increment("menuFailures");
          }
          const allItems = pageResults.flatMap((page) => page.items);
          const items = deduplicateMenuItems(allItems).slice(
            0,
            input.maxMenuItemsPerRestaurant,
          );
          deduplicatedMenuItems += items.length;
          statistics.increment("deduplicatedMenuItems", items.length);
          statistics.increment("itemsAfterLimits", items.length);
          statistics.increment(
            "itemsWithDietaryTags",
            items.filter((item) => item.dietaryTags?.length).length,
          );
          statistics.increment(
            "itemsWithPublishedNutrition",
            items.filter((item) => item.publishedNutrition).length,
          );
          const dietaryOptions = aggregateDietaryOptions({
            itemTags: items.map((item) => item.dietaryTags),
            pageTags: [
              ...(website.homepageDietaryTags ?? []),
              ...pageResults.flatMap((page) => page.dietaryTags ?? []),
            ],
            sectionTags: pageResults.flatMap(
              (page) => page.sectionDietaryTags ?? [],
            ),
          });
          const healthyPositioning = classifyHealthyPositioning({
            homepageText: website.homepageText ?? "",
            sourceUrl: website.finalUrl ?? website.requestedUrl,
            matchedKeywords: restaurant.matchedKeywords,
            menuSections: pageResults.flatMap(
              (page) => page.menuSections ?? [],
            ),
            menuItems: items,
            dietaryOptions,
          });
          if (items.length) {
            menu = {
              ...menu,
              status: "extracted",
              sourceUrl:
                pageResults.find((page) => page.finalUrl)?.finalUrl ??
                menu.sourceUrl,
              extractionMethods: [
                ...new Set(items.flatMap((item) => item.extractionMethods)),
              ],
              itemsFound: items.length,
              items,
            };
          } else if (
            pageResults.every((page) => page.status === "unsupported_format")
          ) {
            menu = {
              ...menu,
              status: "unsupported_format",
              extractionMethods: [],
              itemsFound: 0,
              items: [],
            };
          } else if (
            pageResults.some((page) => page.status === "extraction_failed")
          ) {
            menu = {
              ...menu,
              status: "extraction_failed",
              extractionMethods: [],
              itemsFound: 0,
              items: [],
            };
          } else {
            emptyMenus++;
            menu = {
              ...menu,
              status: "extracted_empty",
              extractionMethods: [],
              itemsFound: 0,
              items: [],
            };
          }
          return {
            ...restaurant,
            contact: {
              ...restaurant.contact,
              website: website.finalUrl ?? website.requestedUrl,
            },
            menu,
            dietaryOptions,
            healthyPositioning,
            warnings: [
              ...restaurant.warnings,
              ...website.warnings,
              ...pageWarnings,
            ],
            errors: [...restaurant.errors, ...website.errors, ...pageErrors],
          };
        }
        const dietaryOptions = aggregateDietaryOptions({
          pageTags: website.homepageDietaryTags ?? [],
        });
        return {
          ...restaurant,
          contact: {
            ...restaurant.contact,
            website: website.finalUrl ?? website.requestedUrl,
          },
          menu,
          dietaryOptions,
          healthyPositioning: classifyHealthyPositioning({
            homepageText: website.homepageText ?? "",
            sourceUrl: website.finalUrl ?? website.requestedUrl,
            matchedKeywords: restaurant.matchedKeywords,
            dietaryOptions,
          }),
          warnings: [
            ...restaurant.warnings,
            ...website.warnings,
            ...pageWarnings,
          ],
          errors: [...restaurant.errors, ...website.errors, ...pageErrors],
        };
      } catch (error) {
        return {
          ...restaurant,
          healthyPositioning: keywordOnlyPositioning,
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

  statistics.set("restaurantsProcessed", enriched.length);
  statistics.set(
    "websitesAvailable",
    enriched.filter((restaurant) => restaurant.contact.website).length,
  );
  statistics.set(
    "menuUrlsFound",
    enriched.reduce(
      (total, restaurant) => total + restaurant.menu.menuUrls.length,
      0,
    ),
  );
  statistics.set(
    "healthyFocusedRestaurants",
    enriched.filter(
      (restaurant) => restaurant.healthyPositioning.isHealthyFocused,
    ).length,
  );
  statistics.set(
    "uncertainClassifications",
    enriched.filter(
      (restaurant) =>
        !restaurant.healthyPositioning.isHealthyFocused &&
        restaurant.healthyPositioning.confidence < 0.7,
    ).length,
  );
  statistics.set(
    "notHealthyFocusedRestaurants",
    enriched.filter(
      (restaurant) =>
        !restaurant.healthyPositioning.isHealthyFocused &&
        restaurant.healthyPositioning.confidence >= 0.7,
    ).length,
  );
  statistics.set(
    "warnings",
    enriched.reduce(
      (total, restaurant) => total + restaurant.warnings.length,
      0,
    ),
  );
  statistics.set(
    "errors",
    enriched.reduce((total, restaurant) => total + restaurant.errors.length, 0),
  );

  for (const restaurant of enriched) {
    if (!isRestaurantOutput(restaurant)) {
      statistics.increment("errors");
      log.error(
        `Output validation failed for ${restaurant.restaurantName ?? "unknown restaurant"}: ${outputValidationIssues(restaurant).join(", ")}.`,
      );
      continue;
    }
    await Actor.pushData(restaurant);
    statistics.increment("resultsPushed");
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
    `Restaurants discovered: ${cards.length}; after deduplication: ${enriched.length}; websites available: ${websitesAvailable}; detail failures: ${detailFailures}; menu pages: ${menuPagesCrawled}; raw menu items: ${rawMenuItems}; deduplicated menu items: ${deduplicatedMenuItems}; empty menus: ${emptyMenus}; menu page failures: ${menuPageFailures}; menu statuses: ${JSON.stringify(menuStatusCounts)}.`,
  );
  if (input.includeMenu) {
    log.info(
      "Phase 5 extracted supported HTML menu pages and explicit dietary, published-nutrition, and healthy-positioning evidence; PDF, image, third-party, and estimated nutrition processing remain out of scope.",
    );
  } else {
    log.info("includeMenu is false; no restaurant websites were crawled.");
  }
} catch (error) {
  const exception = error instanceof Error ? error : new Error(String(error));
  exitCode = 1;
  statistics.increment("errors");
  statusMessage = `Phase 6 restaurant intelligence failed: ${exception.message}`;
  log.exception(exception, "Healthy Restaurants Phase 6 run failed.");
} finally {
  log.info(`Run summary: ${JSON.stringify(statistics.summary())}`);
  await browser?.close();
  await Actor.exit({ exitCode, statusMessage });
}
