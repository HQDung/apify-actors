import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { firmKeyFor } from "../../src/deduplication/firm-key.js";
import { mergeFirms } from "../../src/deduplication/merge-firms.js";
import { resolveLocation } from "../../src/location/locale-resolver.js";
import {
  createSourceDiagnostic,
  sanitizeError,
  sanitizeUrl,
} from "../../src/logging/source-diagnostics.js";
import {
  classifyEmail,
  normalizeEmail,
  normalizePhone,
} from "../../src/normalization/contact.js";
import { canonicalizeUrl, domainFromUrl } from "../../src/normalization/url.js";
import { runPipeline } from "../../src/pipeline/run.js";
import { validateInput } from "../../src/schemas/validators.js";
import { completenessScoreFor } from "../../src/scoring/completeness.js";
import {
  normalizeQuickBooksProfile,
  parseQuickBooksSearchCards,
} from "../../src/sources/quickbooks/quickbooks-parser.js";
import { createXeroAdapter } from "../../src/sources/xero/xero-adapter.js";
import {
  normalizeXeroProfile,
  parseXeroSearchHtml,
} from "../../src/sources/xero/xero-parser.js";
import { mapIndustries, mapServices } from "../../src/taxonomy/taxonomies.js";

const lead = (overrides = {}) => ({
  firmName: "Example Accounting",
  advisorNames: [],
  firmTypes: ["accounting_firm"],
  locations: [],
  website: null,
  domain: null,
  phoneNumbers: [],
  emails: [],
  services: [],
  industriesServed: [],
  softwarePlatforms: [],
  contacts: [],
  socialLinks: {
    linkedin: null,
    facebook: null,
    instagram: null,
    x: null,
  },
  languages: [],
  descriptionOriginal: null,
  descriptionNormalized: null,
  sourcePlatforms: [],
  sourceRecords: [],
  rawData: null,
  ...overrides,
});

describe("accounting firm leads Phase 1", () => {
  it("resolves London and UK locale routes", () => {
    expect(resolveLocation("London, United Kingdom")).toEqual({
      query: "London, United Kingdom",
      city: "London",
      country: "United Kingdom",
      countryCode: "GB",
      locale: "uk",
      xeroSearchUrl:
        "https://www.xero.com/uk/find-advisors/united-kingdom/england/greater-london/london-city/",
      quickBooksSearchUrl:
        "https://proadvisor.intuit.com/app/accountant/search?region=uk",
    });
  });

  it("recognizes UK aliases and London without a country", () => {
    for (const query of ["UK", "Great Britain", "England", "London"]) {
      expect(resolveLocation(query)).toEqual(
        expect.objectContaining({
          country: "United Kingdom",
          countryCode: "GB",
          locale: "uk",
          quickBooksSearchUrl:
            "https://proadvisor.intuit.com/app/accountant/search?region=uk",
        }),
      );
    }
  });

  it("leaves unsupported locations unlocalized", () => {
    expect(resolveLocation("Singapore")).toEqual({
      query: "Singapore",
      city: null,
      country: null,
      countryCode: null,
      locale: null,
      xeroSearchUrl: null,
      quickBooksSearchUrl:
        "https://proadvisor.intuit.com/app/accountant/search",
    });
  });

  it("redacts URL credentials and sensitive query values", () => {
    expect(
      sanitizeUrl(
        "https://user:pass@example.test/search?token=secret&page=1&sessionId=abc",
      ),
    ).toBe(
      "https://example.test/search?token=REDACTED&page=1&sessionId=REDACTED",
    );
  });

  it("builds bounded source diagnostics without response bodies", () => {
    expect(
      createSourceDiagnostic({
        source: "xero",
        location: "London, United Kingdom",
        stage: "search",
        requestedUrl: "https://example.test/?token=secret",
        status: 200,
        contentType: "text/html",
        responseSize: 123,
        parsedItems: 5,
        error: new Error("bad token=secret\n<html>"),
      }),
    ).toEqual({
      source: "xero",
      location: "London, United Kingdom",
      stage: "search",
      requestedUrl: "https://example.test/?token=REDACTED",
      httpStatus: 200,
      contentType: "text/html",
      responseSize: 123,
      parsedItems: 5,
      error: "bad token=REDACTED",
    });
    expect(sanitizeError(new Error("cookie=secret\n<html>"))).toBe(
      "cookie=REDACTED",
    );
  });

  it("parses a sanitized Xero London embedded-JSON fixture", async () => {
    const html = await readFile(
      new URL("../fixtures/xero/london-search.html", import.meta.url),
      "utf8",
    );
    expect(parseXeroSearchHtml(html, 10)).toEqual([
      expect.objectContaining({
        firmName: "Sopher + Co LLP",
        source: "xero",
        profileUrl:
          "https://xero.com/uk/advisors/accountant/sopher-co-71ab8e0c4daf",
      }),
    ]);
  });

  it("normalizes a public Xero London profile", async () => {
    const profile = JSON.parse(
      await readFile(
        new URL("../fixtures/xero/london-profile.json", import.meta.url),
        "utf8",
      ),
    );
    const normalized = normalizeXeroProfile(profile, {
      locationQuery: "London, United Kingdom",
      includeRawData: false,
    });
    expect(normalized).toEqual(
      expect.objectContaining({
        firmName: "Sopher + Co",
        advisorNames: ["Raz Miah", "Antonia Buliga"],
        locations: [
          expect.objectContaining({ city: "London", countryCode: "GB" }),
        ],
        services: expect.arrayContaining(["tax", "audit", "business_advisory"]),
        sourcePlatforms: ["xero"],
      }),
    );
    expect(normalized.softwarePlatforms[0]).toEqual(
      expect.objectContaining({
        platform: "xero",
        relationship: "partner",
        profileUrl: profile.profileUrl,
      }),
    );
  });

  it("derives a UK Xero profile city from the published address", () => {
    const normalized = normalizeXeroProfile(
      {
        firmName: "MHA",
        profileUrl: "https://www.xero.com/advisors/example/",
        address:
          "1 The Forum, Minerva Business Park, Lynchwood, Peterborough, England",
      },
      {
        locationQuery: "London, United Kingdom",
        includeRawData: false,
      },
    );
    expect(normalized.locations[0]).toEqual(
      expect.objectContaining({ city: "Peterborough", region: "England" }),
    );
  });

  it("uses the resolved London URL and reports safe Xero search metadata", async () => {
    const html = await readFile(
      new URL("../fixtures/xero/london-search.html", import.meta.url),
      "utf8",
    );
    const requestedUrls = [];
    const diagnostics = [];
    const adapter = createXeroAdapter({
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        return new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
      onDiagnostic: (event) => diagnostics.push(event),
    });
    const items = await adapter.search({
      location: "London, United Kingdom",
      limit: 10,
    });
    expect(items).toHaveLength(1);
    expect(requestedUrls).toEqual([
      "https://www.xero.com/uk/find-advisors/united-kingdom/england/greater-london/london-city/",
    ]);
    expect(diagnostics).toEqual([
      expect.objectContaining({
        source: "xero",
        location: "London, United Kingdom",
        stage: "search",
        httpStatus: 200,
        contentType: "text/html; charset=utf-8",
        responseSize: Buffer.byteLength(html),
        parsedItems: 1,
        error: null,
      }),
    ]);
  });

  it("parses and normalizes public QuickBooks search and profile fixtures", async () => {
    const fixture = JSON.parse(
      await readFile(
        new URL(
          "../fixtures/quickbooks/new-york-profile.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(parseQuickBooksSearchCards([fixture.searchCard], 1)).toEqual([
      expect.objectContaining({
        id: "pooja-r-loomba-cpa",
        firmName: "PL Accounting Solutions LLC",
      }),
    ]);

    const normalized = normalizeQuickBooksProfile(fixture.profile, {
      locationQuery: "New York, United States",
      includeRawData: false,
    });
    expect(normalized).toEqual(
      expect.objectContaining({
        firmName: "PL Accounting Solutions LLC",
        advisorNames: ["Pooja Loomba"],
        website: "https://placcountingsolutions.com",
        domain: "placcountingsolutions.com",
        services: expect.arrayContaining([
          "accounting",
          "bookkeeping",
          "budgeting_forecasting",
        ]),
        industriesServed: expect.arrayContaining([
          "technology",
          "construction",
          "financial_services",
          "healthcare",
          "property_real_estate",
          "wholesale",
        ]),
        languages: ["en", "pa", "hi"],
        sourcePlatforms: ["quickbooks"],
      }),
    );
    expect(normalized.emails).toEqual([
      {
        email: "ploomba@placcountingsolutions.com",
        type: "personal_business",
        source: "quickbooks",
      },
    ]);
    expect(normalized.softwarePlatforms[0]).toEqual(
      expect.objectContaining({
        platform: "quickbooks",
        relationship: "proadvisor",
        certifications: expect.arrayContaining([
          "quickbooks_online_level_2",
          "quickbooks_desktop_advanced",
        ]),
      }),
    );
  });

  it("validates, trims, and deduplicates the public input", () => {
    expect(
      validateInput({
        locations: [" London, United Kingdom ", "london, united kingdom"],
        sources: ["xero", "xero"],
        maxResults: 25,
      }),
    ).toEqual(
      expect.objectContaining({
        locations: ["London, United Kingdom"],
        sources: ["xero"],
        maxResults: 25,
        enrichWebsites: true,
        extractContacts: true,
        includeRawData: false,
      }),
    );
  });

  it("rejects invalid input bounds and source IDs", () => {
    expect(() => validateInput({ locations: [] })).toThrow(
      "At least one location is required",
    );
    expect(() =>
      validateInput({
        locations: Array.from({ length: 21 }, (_, i) => `L${i}`),
      }),
    ).toThrow("at most 20");
    expect(() =>
      validateInput({ locations: ["London"], sources: ["google"] }),
    ).toThrow("Unsupported sources: google");
    expect(() =>
      validateInput({ locations: ["London"], maxResults: 5001 }),
    ).toThrow("between 1 and 5000");
  });

  it("canonicalizes URLs, domains, phones, and public emails", () => {
    expect(
      canonicalizeUrl("HTTP://WWW.Example.COM/about/?utm_source=x#team"),
    ).toBe("https://example.com/about");
    expect(domainFromUrl("https://www.example.co.uk/contact")).toBe(
      "example.co.uk",
    );
    expect(normalizePhone("+44 (0)20 1234 5678")).toBe("+4402012345678");
    expect(normalizeEmail(" Hello@Example.COM ")).toBe("hello@example.com");
    expect(classifyEmail("careers@example.com")).toBe("careers");
  });

  it("maps explicit service and industry labels without inventing unknowns", () => {
    expect(
      mapServices(["Bookkeeping", "Cash flow forecasting", "Payroll"]),
    ).toEqual([
      "bookkeeping",
      "cash_flow_management",
      "budgeting_forecasting",
      "payroll",
    ]);
    expect(
      mapIndustries(["E-commerce", "Construction", "Space mining"]),
    ).toEqual(["ecommerce", "construction"]);
  });

  it("uses domain first and refuses a generic name-only firm key", () => {
    expect(
      firmKeyFor(
        lead({ website: "https://example.com", domain: "example.com" }),
      ),
    ).toBe("domain:example.com");
    expect(
      firmKeyFor(
        lead({
          phoneNumbers: ["+44 20 1234 5678"],
          locations: [{ countryCode: "GB" }],
        }),
      ),
    ).toBe("phone:GB:+442012345678");
    expect(firmKeyFor(lead({ firmName: "Accounting Services" }))).toBeNull();
  });

  it("merges cross-platform firms while preserving provenance", () => {
    const merged = mergeFirms(
      lead({
        firmName: "Example Accounting Ltd",
        website: "https://example.com",
        domain: "example.com",
        advisorNames: ["Jane Smith"],
        services: ["bookkeeping"],
        softwarePlatforms: [
          { platform: "xero", profileUrl: "https://xero.test/a" },
        ],
        sourcePlatforms: ["xero"],
        sourceRecords: [{ source: "xero", profileUrl: "https://xero.test/a" }],
      }),
      lead({
        firmName: "Example Accounting",
        website: "https://www.example.com/",
        domain: "example.com",
        advisorNames: ["John Lee"],
        services: ["tax"],
        softwarePlatforms: [
          { platform: "quickbooks", profileUrl: "https://quickbooks.test/a" },
        ],
        sourcePlatforms: ["quickbooks"],
        sourceRecords: [
          { source: "quickbooks", profileUrl: "https://quickbooks.test/a" },
        ],
      }),
    );

    expect(merged.advisorNames).toEqual(["Jane Smith", "John Lee"]);
    expect(merged.services).toEqual(["bookkeeping", "tax"]);
    expect(merged.sourcePlatforms).toEqual(["xero", "quickbooks"]);
    expect(merged.sourceRecords).toHaveLength(2);
  });

  it("computes the documented deterministic completeness score", () => {
    expect(
      completenessScoreFor(
        lead({
          website: "https://example.com",
          domain: "example.com",
          emails: [{ email: "hello@example.com", source: "website" }],
          phoneNumbers: ["+442012345678"],
          locations: [
            {
              address: "10 Example Street",
              city: "London",
              country: "United Kingdom",
              countryCode: "GB",
            },
          ],
          services: ["bookkeeping"],
          industriesServed: ["construction"],
          softwarePlatforms: [
            {
              platform: "xero",
              certifications: ["xero_advisor"],
              specialties: [],
            },
          ],
          contacts: [{ name: "Jane Smith", role: "Partner" }],
          descriptionOriginal: "Public accounting firm.",
          sourceRecords: [
            { source: "xero", profileUrl: "https://xero.test/a" },
          ],
        }),
      ),
    ).toBe(100);
  });

  it("runs mocked adapters, keeps partial results, merges, and caps final leads", async () => {
    let xeroProfileContext;
    const xero = {
      source: "xero",
      search: async ({ location }) => [
        { id: `xero-${location}`, profileUrl: "https://xero.test/example" },
      ],
      fetchProfile: async (item, context) => {
        xeroProfileContext = context;
        return item;
      },
      normalize: () =>
        lead({
          firmName: "Example Accounting",
          website: "https://example.com",
          domain: "example.com",
          contacts: [
            {
              name: "Jane Smith",
              role: "Partner",
              source: "xero",
            },
          ],
          sourcePlatforms: ["xero"],
          sourceRecords: [
            {
              source: "xero",
              profileUrl: "https://xero.test/example",
              locationQuery: "London",
            },
          ],
        }),
    };
    const quickbooks = {
      source: "quickbooks",
      search: async () => [
        {
          id: "quickbooks-example",
          profileUrl: "https://quickbooks.test/example",
        },
      ],
      fetchProfile: async (item) => item,
      normalize: () =>
        lead({
          firmName: "Example Accounting LLC",
          website: "https://www.example.com",
          domain: "example.com",
          sourcePlatforms: ["quickbooks"],
          sourceRecords: [
            {
              source: "quickbooks",
              profileUrl: "https://quickbooks.test/example",
              locationQuery: "London",
            },
          ],
        }),
    };
    const failing = {
      source: "quickbooks",
      search: async () => {
        throw new Error("temporary block");
      },
    };

    const result = await runPipeline({
      input: validateInput({
        locations: ["London"],
        sources: ["xero", "quickbooks"],
        maxResults: 1,
        enrichWebsites: false,
        extractContacts: false,
      }),
      adapters: { xero, quickbooks },
      now: () => new Date("2026-07-19T08:00:00.000Z"),
    });
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0]).toEqual(
      expect.objectContaining({
        firmName: "Example Accounting",
        hasXeroProfile: true,
        hasQuickBooksProfile: true,
        scrapedAt: "2026-07-19T08:00:00.000Z",
        contacts: [],
      }),
    );
    expect(result.summary.resultsPushed).toBe(1);
    expect(xeroProfileContext).toEqual({ location: "London" });
    expect(result.summary.effectiveInput).toEqual({
      locations: ["London"],
      sources: ["xero", "quickbooks"],
      maxResults: 1,
      enrichWebsites: false,
      extractContacts: false,
      includeRawData: false,
    });

    const partial = await runPipeline({
      input: validateInput({
        locations: ["London"],
        sources: ["xero", "quickbooks"],
      }),
      adapters: { xero, quickbooks: failing },
      now: () => new Date("2026-07-19T08:00:00.000Z"),
    });
    expect(partial.leads).toHaveLength(1);
    expect(partial.summary.sourceFailures.quickbooks).toBe(1);
  });
});
