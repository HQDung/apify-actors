import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { processMenuPage } from "../../src/menu/process-menu-page.js";

const fixture = (name) =>
  fs.readFileSync(path.join("test/fixtures/menus", name), "utf8");

const response = (body) => ({
  status: 200,
  headers: new Headers({ "content-type": "text/html" }),
  text: async () => body,
});

describe("London Phase 4 menu fixtures", () => {
  it("extracts representative discovered HTML menus", async () => {
    const base = "https://london-menu-fixtures.example";
    const fixtures = new Map([
      [`${base}/standard`, fixture("standard-card.html")],
      [`${base}/list`, fixture("list-menu.html")],
      [`${base}/jsonld`, fixture("jsonld-menu.html")],
      [`${base}/empty`, fixture("empty.html")],
      [`${base}/malformed`, fixture("malformed-structured.html")],
    ]);
    const fetchImpl = async (url) => {
      const body = fixtures.get(url);
      if (!body) throw new Error(`missing London fixture: ${url}`);
      return response(body);
    };
    const results = await Promise.all(
      [...fixtures.keys()].map((url) =>
        processMenuPage({
          candidate: { url, format: "html" },
          fetchImpl,
          defaultCurrency: "GBP",
          maxItems: 10,
        }),
      ),
    );

    expect(results.map((result) => result.status)).toEqual([
      "extracted",
      "extracted",
      "extracted",
      "extracted_empty",
      "extracted",
    ]);
    expect(
      results.reduce((total, result) => total + result.items.length, 0),
    ).toBe(5);
    expect(
      results.flatMap((result) => result.items).every((item) => item.sourceUrl),
    ).toBe(true);
  });
});
