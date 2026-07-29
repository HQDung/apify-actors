import { describe, expect, it } from "vitest";

import { crawlRestaurantWebsite } from "../../src/website/crawl-restaurant-website.js";

const response = (status, body, contentType = "text/html") => ({
  status,
  headers: new Headers({ "content-type": contentType }),
  text: async () => body,
});

describe("restaurant website crawling", () => {
  it("returns menu_found with bounded, provenance-bearing candidates", async () => {
    const result = await crawlRestaurantWebsite({
      website: "https://example.com",
      maximumMenuPages: 1,
      fetchImpl: async () =>
        response(
          200,
          '<nav><a href="/menu">Menu</a><a href="/food">Food</a></nav>',
        ),
    });

    expect(result.menu.status).toBe("menu_found");
    expect(result.menu.menuCandidates).toHaveLength(1);
    expect(result.menu.menuCandidates[0]).toEqual(
      expect.objectContaining({
        url: "https://example.com/menu",
        sourceUrl: "https://example.com",
        format: "html",
      }),
    );
  });

  it("returns unsupported_format for PDF-only homepages", async () => {
    const result = await crawlRestaurantWebsite({
      website: "https://example.com/menu.pdf",
      fetchImpl: async () => response(200, "%PDF", "application/pdf"),
    });

    expect(result.menu.status).toBe("unsupported_format");
    expect(result.menu.menuCandidates[0].format).toBe("pdf");
  });

  it("returns menu_not_found for a reachable homepage without menu links", async () => {
    const result = await crawlRestaurantWebsite({
      website: "https://example.com",
      fetchImpl: async () => response(200, "<html><body>Welcome</body></html>"),
    });

    expect(result.menu.status).toBe("menu_not_found");
    expect(result.warnings[0].code).toBe("MENU_NOT_FOUND");
  });

  it("returns website_unreachable when the request fails", async () => {
    const result = await crawlRestaurantWebsite({
      website: "https://example.com",
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });

    expect(result.menu.status).toBe("website_unreachable");
    expect(result.errors[0].code).toBe("WEBSITE_UNREACHABLE");
  });

  it("times out when the homepage response body never completes", async () => {
    const result = await crawlRestaurantWebsite({
      website: "https://slow.example",
      timeoutMs: 10,
      fetchImpl: async () => ({
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: () => new Promise(() => {}),
      }),
    });

    expect(result.menu.status).toBe("website_unreachable");
    expect(result.errors[0].message).toContain("response body timeout");
  });
});
