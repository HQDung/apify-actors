import { chromium } from "playwright";
import { describe, expect, it } from "vitest";

import { discoverPlaceCards } from "../../src/discovery/google-maps.js";
import { buildSearchJobs } from "../../src/discovery/restaurants.js";
import { validateInput } from "../../src/schemas/validators.js";

const runIntegration =
  process.env.RUN_LONDON_INTEGRATION === "1" ? it : it.skip;

describe("London Phase 2 discovery", () => {
  runIntegration(
    "discovers bounded restaurant cards for the documented input",
    async () => {
      const input = validateInput({
        location: "London, United Kingdom",
        keywords: ["healthy restaurant", "salad bar"],
        maxRestaurants: 10,
        includeMenu: false,
      });
      expect(input.includeMenu).toBe(false);
      const browser = await chromium.launch({ headless: true });
      try {
        const cards = await discoverPlaceCards({
          browser,
          createContext: async (instance) => instance.newContext(),
          searchJobs: buildSearchJobs(input),
          maxPlacesPerJob: input.maxRestaurants,
        });
        expect(cards.length).toBeGreaterThan(0);
        expect(cards.length).toBeLessThanOrEqual(20);
        expect(cards.every((card) => card.sourceUrl)).toBe(true);
      } finally {
        await browser.close();
      }
    },
    180_000,
  );
});
