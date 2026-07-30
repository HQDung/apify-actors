import { describe, expect, it } from "vitest";

import { crawlRestaurantWebsite } from "../../src/website/crawl-restaurant-website.js";
import {
  canonicalizeWebsiteUrl,
  classifyMenuFormat,
  deduplicateMenuCandidates,
  discoverMenuCandidatesFromHtml,
  fetchWithRedirects,
  isSameDomain,
  readResponseTextWithTimeout,
  resolveUrl,
  scoreMenuCandidate,
} from "../../src/website/menu-discovery.js";

const responseForWebsite = (status, body) => ({
  status,
  headers: new Headers({ "content-type": "text/html" }),
  text: async () => body,
});

describe("website URL handling", () => {
  it("normalizes HTTP URLs and rejects unsafe protocols", () => {
    expect(
      canonicalizeWebsiteUrl(" HTTPS://WWW.Example.com/restaurant/#menu "),
    ).toBe("https://example.com/restaurant");
    const unsafeProtocol = ["java", "script:alert(1)"].join("");
    expect(canonicalizeWebsiteUrl(unsafeProtocol)).toBeNull();
    expect(canonicalizeWebsiteUrl("mailto:hello@example.com")).toBeNull();
  });

  it("resolves relative links against the final homepage URL", () => {
    expect(resolveUrl("../menu", "https://example.com/locations/london")).toBe(
      "https://example.com/menu",
    );
    expect(resolveUrl("/menus", "https://example.com/locations/london")).toBe(
      "https://example.com/menus",
    );
  });

  it("compares domains without treating www as a different site", () => {
    expect(
      isSameDomain("https://www.example.com", "https://example.com/menu"),
    ).toBe(true);
    expect(
      isSameDomain("https://example.com", "https://menu.example.net"),
    ).toBe(false);
  });

  it("follows bounded safe redirects and returns the final canonical URL", async () => {
    const fetchImpl = async (url) => {
      if (url === "https://example.com")
        return {
          status: 302,
          headers: new Headers({ location: "/home" }),
          text: async () => "",
        };
      return {
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => "<html></html>",
      };
    };

    const result = await fetchWithRedirects("https://example.com", {
      fetchImpl,
      timeoutMs: 1000,
      maxRedirects: 2,
    });

    expect(result.finalUrl).toBe("https://example.com/home");
    expect(result.redirectChain).toEqual([
      "https://example.com",
      "https://example.com/home",
    ]);
  });

  it("retries a transient HTTP response but does not retry a deterministic 404", async () => {
    let transientAttempts = 0;
    const transientResult = await fetchWithRedirects("https://example.com", {
      fetchImpl: async () => {
        transientAttempts += 1;
        if (transientAttempts === 1)
          return responseForWebsite(503, "temporarily unavailable");
        return responseForWebsite(200, "<html></html>");
      },
      timeoutMs: 1000,
      maxAttempts: 2,
      retryBaseDelayMs: 0,
    });

    let deterministicAttempts = 0;
    const deterministicResult = await fetchWithRedirects(
      "https://example.com/not-found",
      {
        fetchImpl: async () => {
          deterministicAttempts += 1;
          return responseForWebsite(404, "not found");
        },
        timeoutMs: 1000,
        maxAttempts: 2,
        retryBaseDelayMs: 0,
      },
    );

    expect(transientAttempts).toBe(2);
    expect(transientResult.response.status).toBe(200);
    expect(deterministicAttempts).toBe(1);
    expect(deterministicResult.response.status).toBe(404);
  });

  it("rejects a response body that exceeds the configured size limit", async () => {
    await expect(
      readResponseTextWithTimeout(
        responseForWebsite(200, "123456789"),
        1000,
        4,
      ),
    ).rejects.toThrow("response body exceeds the configured limit");
  });

  it("labels an access-denied homepage as blocked", async () => {
    const result = await crawlRestaurantWebsite({
      website: "https://example.com",
      fetchImpl: async () => responseForWebsite(403, "forbidden"),
      retryBaseDelayMs: 0,
    });

    expect(result.errors[0].code).toBe("WEBSITE_BLOCKED");
  });
});

describe("menu candidate discovery", () => {
  const homepage = "https://example.com/";

  it("extracts navigation, footer, structured metadata, and common menu candidates", () => {
    const html = `
      <nav><a href="/menu">Menu</a><a href="/about">About</a></nav>
      <main><a href="/food">Our Food</a></main>
      <footer><a href="/allergens">Allergens</a></footer>
      <script type="application/ld+json">{"@type":"Restaurant","menu":"/menus"}</script>
    `;

    const candidates = discoverMenuCandidatesFromHtml(html, homepage);
    const urls = candidates.map((candidate) => candidate.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://example.com/menu",
        "https://example.com/food",
        "https://example.com/allergens",
        "https://example.com/menus",
        "https://example.com/nutrition",
      ]),
    );
  });

  it("does not treat a normal homepage canonical link as a menu", () => {
    expect(
      discoverMenuCandidatesFromHtml(
        '<link rel="canonical" href="https://example.com/">',
        homepage,
      ),
    ).toEqual([]);
  });

  it("scores same-domain menu links above generic and third-party links", () => {
    const official = scoreMenuCandidate({
      url: "https://example.com/menu",
      text: "View Menu",
      source: "navigation",
      homepageUrl: "https://example.com/",
    });
    const thirdParty = scoreMenuCandidate({
      url: "https://ordering.example.net/store/green-kitchen",
      text: "Order online",
      source: "homepage",
      homepageUrl: "https://example.com/",
    });

    expect(official).toBeGreaterThan(thirdParty);
    expect(official).toBeGreaterThan(0);
  });

  it.each([
    ["https://example.com/menu.pdf", "pdf"],
    ["https://example.com/menu.png", "image"],
    ["https://deliveroo.co.uk/menu/example", "third_party_ordering"],
    ["https://example.com/menu", "html"],
  ])("classifies %s as %s", (url, expected) => {
    expect(classifyMenuFormat(url)).toBe(expected);
  });

  it("deduplicates canonical URLs while merging provenance", () => {
    const candidates = deduplicateMenuCandidates([
      {
        url: "https://www.example.com/menu/#top",
        source: "navigation",
        text: "Menu",
        score: 70,
      },
      {
        url: "https://example.com/menu?utm_source=maps",
        source: "structured_metadata",
        text: "",
        score: 55,
      },
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toEqual(
      expect.objectContaining({
        url: "https://example.com/menu",
        sources: ["navigation", "structured_metadata"],
        score: 70,
      }),
    );
  });
});
