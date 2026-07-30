import { describe, expect, it } from "vitest";

import {
  processMenuPage,
  selectHtmlMenuCandidates,
} from "../../src/menu/process-menu-page.js";

const response = (status, body, headers = {}) => ({
  status,
  headers: new Headers({ "content-type": "text/html", ...headers }),
  text: async () => body,
});

describe("menu page processing", () => {
  it("keeps only HTML candidates within the page limit", () => {
    expect(
      selectHtmlMenuCandidates(
        [
          { url: "https://example.com/one", format: "html" },
          { url: "https://example.com/two", format: "pdf" },
          { url: "https://example.com/three", format: "html" },
        ],
        1,
      ),
    ).toHaveLength(1);
  });

  it("follows redirects and extracts only HTML candidates", async () => {
    const result = await processMenuPage({
      candidate: {
        url: "https://example.com/menu",
        format: "html",
      },
      fetchImpl: async (url) =>
        url === "https://example.com/menu"
          ? response(302, "", { location: "/food" })
          : response(
              200,
              '<article class="menu-item"><h3>Green Bowl</h3><span class="price">£12</span></article>',
            ),
    });

    expect(result.status).toBe("extracted");
    expect(result.finalUrl).toBe("https://example.com/food");
    expect(result.items[0].sourceUrl).toBe("https://example.com/food");
  });

  it("returns extracted_empty for a reachable HTML page without valid items", async () => {
    const result = await processMenuPage({
      candidate: { url: "https://example.com/menu", format: "html" },
      fetchImpl: async () => response(200, "<main><h1>Welcome</h1></main>"),
    });

    expect(result.status).toBe("extracted_empty");
    expect(result.items).toEqual([]);
  });

  it.each(["pdf", "image", "third_party_ordering", "unknown"])(
    "preserves %s candidates without fetching them",
    async (format) => {
      let called = false;
      const result = await processMenuPage({
        candidate: { url: `https://example.com/menu-${format}`, format },
        fetchImpl: async () => {
          called = true;
          return response(200, "unsupported");
        },
      });

      expect(result.status).toBe("unsupported_format");
      expect(called).toBe(false);
    },
  );

  it("isolates a failed menu page", async () => {
    const result = await processMenuPage({
      candidate: { url: "https://example.com/menu", format: "html" },
      fetchImpl: async () => {
        throw new Error("menu unavailable");
      },
    });

    expect(result.status).toBe("extraction_failed");
    expect(result.errors[0].code).toBe("MENU_EXTRACTION_FAILED");
  });
});
