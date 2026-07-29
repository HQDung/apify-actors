import { describe, expect, it } from "vitest";

import { crawlRestaurantWebsite } from "../../src/website/crawl-restaurant-website.js";

const response = (status, body, location, contentType = "text/html") => ({
  status,
  headers: new Headers({
    "content-type": contentType,
    ...(location ? { location } : {}),
  }),
  text: async () => body,
});

describe("London Phase 3 website fixtures", () => {
  it("covers HTML, PDF-only, third-party, no-menu, redirect, and unreachable sites", async () => {
    const base = "https://london-fixtures.example";
    const fixtures = new Map([
      [
        `${base}/html`,
        response(200, '<nav><a href="/menu">London Menu</a></nav>'),
      ],
      [`${base}/pdf-only`, response(200, "%PDF", undefined, "application/pdf")],
      [
        `${base}/third-party`,
        response(
          200,
          '<main><a href="https://deliveroo.co.uk/menu/london">Order menu</a></main>',
        ),
      ],
      [
        `${base}/no-menu`,
        response(
          200,
          '<link rel="canonical" href="https://london-fixtures.example/no-menu"><main>London restaurant homepage</main>',
        ),
      ],
      [`${base}/redirect`, response(302, "", "/html")],
    ]);
    const fetchImpl = async (url) => {
      if (url === `${base}/unreachable`) throw new Error("fixture unreachable");
      const fixture = fixtures.get(url);
      if (!fixture) throw new Error(`missing fixture: ${url}`);
      return fixture;
    };

    const [html, pdf, thirdParty, noMenu, redirected, unreachable] =
      await Promise.all([
        crawlRestaurantWebsite({ website: `${base}/html`, fetchImpl }),
        crawlRestaurantWebsite({ website: `${base}/pdf-only`, fetchImpl }),
        crawlRestaurantWebsite({ website: `${base}/third-party`, fetchImpl }),
        crawlRestaurantWebsite({ website: `${base}/no-menu`, fetchImpl }),
        crawlRestaurantWebsite({ website: `${base}/redirect`, fetchImpl }),
        crawlRestaurantWebsite({ website: `${base}/unreachable`, fetchImpl }),
      ]);

    expect(html.menu.status).toBe("menu_found");
    expect(pdf.menu.status).toBe("unsupported_format");
    expect(thirdParty.menu.status).toBe("menu_found");
    expect(noMenu.menu.status).toBe("menu_not_found");
    expect(redirected.finalUrl).toBe(`${base}/html`);
    expect(redirected.menu.status).toBe("menu_found");
    expect(unreachable.menu.status).toBe("website_unreachable");
  });
});
