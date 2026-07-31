import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { firmKeyFor } from "../../src/deduplication/firm-key.js";
import { mergeFirms } from "../../src/deduplication/merge-firms.js";
import { createWebsiteEnricher } from "../../src/enrichment/website-enricher.js";
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
import {
  isRetryableError,
  retryOperation,
  withTimeout,
} from "../../src/reliability/retry.js";
import { validateInput } from "../../src/schemas/validators.js";
import { completenessScoreFor } from "../../src/scoring/completeness.js";
import {
  createQuickBooksAdapter,
  quickBooksSearchRequestFor,
} from "../../src/sources/quickbooks/quickbooks-adapter.js";
import {
  normalizeQuickBooksProfile,
  parseQuickBooksAddress,
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
  it("retries transient operations and stops on deterministic errors", async () => {
    let attempts = 0;
    await expect(
      retryOperation(
        async () => {
          attempts += 1;
          if (attempts < 3)
            throw Object.assign(new Error("busy"), { status: 503 });
          return "ok";
        },
        { attempts: 3, delayMs: 0 },
      ),
    ).resolves.toBe("ok");
    expect(attempts).toBe(3);

    expect(
      isRetryableError(
        Object.assign(new Error("bad request"), { status: 400 }),
      ),
    ).toBe(false);
    expect(
      isRetryableError(
        Object.assign(new Error("rate limited"), { status: 429 }),
      ),
    ).toBe(true);
  });

  it("runs an awaited retry hook before the next attempt", async () => {
    const events = [];
    let attempts = 0;
    await expect(
      retryOperation(
        async () => {
          attempts += 1;
          if (attempts === 1) throw new Error("navigation timeout");
          return "ok";
        },
        {
          delayMs: 0,
          onRetry: async ({ attempt, nextAttempt }) => {
            events.push([attempt, nextAttempt]);
          },
        },
      ),
    ).resolves.toBe("ok");
    expect(events).toEqual([[1, 2]]);
  });

  it("bounds operations that never settle", async () => {
    await expect(withTimeout(() => new Promise(() => {}), 5)).rejects.toThrow(
      "Operation timed out after 5ms.",
    );
  });

  it("accepts multiple normalized global locations without a hidden result floor", () => {
    expect(
      validateInput({
        locations: [
          " London, United Kingdom ",
          "Sydney, Australia",
          "London, United Kingdom",
        ],
        sources: ["xero", "quickbooks"],
        maxResults: 10,
      }),
    ).toEqual(
      expect.objectContaining({
        locations: ["London, United Kingdom", "Sydney, Australia"],
        maxResults: 10,
      }),
    );
  });

  it("rejects empty locations and accepts an unknown country best-effort", () => {
    expect(() => validateInput({ locations: ["", "  "] })).toThrow(
      "locations must contain at least one non-empty value.",
    );
    expect(
      validateInput({ locations: ["Reykjavik, Iceland"] }).locations,
    ).toEqual(["Reykjavik, Iceland"]);
  });

  it("resolves guaranteed global country routes", () => {
    expect(resolveLocation("Sydney, Australia")).toEqual(
      expect.objectContaining({
        city: "Sydney",
        country: "Australia",
        countryCode: "AU",
        locale: "au",
        xeroSearchUrl: expect.stringContaining("xero.com/au/"),
        quickBooksSearchUrl: expect.stringContaining("region=au"),
      }),
    );
    expect(resolveLocation("New York, United States")).toEqual(
      expect.objectContaining({
        city: "New York",
        country: "United States",
        countryCode: "US",
        locale: "us",
        xeroSearchUrl: expect.stringContaining("xero.com/us/"),
        quickBooksSearchUrl: expect.stringContaining("region=us"),
      }),
    );
    expect(resolveLocation("Singapore")).toEqual(
      expect.objectContaining({
        country: "Singapore",
        countryCode: "SG",
        locale: "sg",
        xeroSearchUrl: expect.stringContaining("xero.com/sg/"),
        quickBooksSearchUrl: expect.stringContaining("region=sg"),
      }),
    );
  });

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
    expect(resolveLocation("Reykjavik")).toEqual({
      query: "Reykjavik",
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

  it("uses the requested global locale when normalizing an Xero profile", () => {
    const normalized = normalizeXeroProfile(
      {
        firmName: "Sydney Advisory",
        profileUrl: "https://www.xero.com/au/advisors/example/",
        address: "1 George Street, Sydney NSW 2000",
      },
      {
        locationQuery: "Sydney, Australia",
        includeRawData: false,
      },
    );
    expect(normalized.locations[0]).toEqual(
      expect.objectContaining({
        city: "Sydney",
        country: "Australia",
        countryCode: "AU",
      }),
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

  it("retries a transient Xero search response", async () => {
    const html = await readFile(
      new URL("../fixtures/xero/london-search.html", import.meta.url),
      "utf8",
    );
    let calls = 0;
    const adapter = createXeroAdapter({
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) return new Response("busy", { status: 503 });
        return new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    });
    await expect(
      adapter.search({ location: "London, United Kingdom", limit: 10 }),
    ).resolves.toHaveLength(1);
    expect(calls).toBe(2);
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
      locationQuery: "London, United Kingdom",
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

  it("builds a UK QuickBooks request with a city-only search term", () => {
    expect(quickBooksSearchRequestFor("London, United Kingdom")).toEqual({
      requestedUrl:
        "https://proadvisor.intuit.com/app/accountant/search?region=uk",
      searchTerm: "London",
    });
  });

  it("parses UK QuickBooks addresses while preserving US parsing", () => {
    expect(
      parseQuickBooksAddress(["10 Example Street", "London SW1A 1AA"], {
        country: "United Kingdom",
        countryCode: "GB",
      }),
    ).toEqual({
      address: "10 Example Street, London SW1A 1AA",
      city: "London",
      region: null,
      postalCode: "SW1A 1AA",
      country: "United Kingdom",
      countryCode: "GB",
    });
    expect(
      parseQuickBooksAddress(["5 St Bride Street", "London, London WC2N 5DU"], {
        country: "United Kingdom",
        countryCode: "GB",
      }).city,
    ).toBe("London");
    expect(
      parseQuickBooksAddress(["450 Park Ave", "NEW YORK, NY 10016"]),
    ).toEqual(
      expect.objectContaining({
        city: "NEW YORK",
        region: "NY",
        postalCode: "10016",
        countryCode: "US",
      }),
    );
  });

  it("parses Australian and Singapore QuickBooks addresses", () => {
    expect(
      parseQuickBooksAddress(["1 George Street", "Sydney NSW 2000"], {
        country: "Australia",
        countryCode: "AU",
      }),
    ).toEqual({
      address: "1 George Street, Sydney NSW 2000",
      city: "Sydney",
      region: "NSW",
      postalCode: "2000",
      country: "Australia",
      countryCode: "AU",
    });
    expect(
      parseQuickBooksAddress(["10 Example Road", "Singapore 048622"], {
        country: "Singapore",
        countryCode: "SG",
      }),
    ).toEqual(
      expect.objectContaining({
        city: "Singapore",
        postalCode: "048622",
        countryCode: "SG",
      }),
    );
  });

  it("uses the UK route and emits safe QuickBooks search diagnostics", async () => {
    const actions = [];
    const diagnostics = [];
    const response = {
      status: () => 200,
      headers: () => ({
        "content-type": "text/html; charset=utf-8",
        "content-length": "1234",
      }),
    };
    const page = {
      setDefaultTimeout: () => {},
      goto: async (url) => {
        actions.push(["goto", url]);
        return response;
      },
      locator: () => ({
        fill: async (value) => actions.push(["fill", value]),
        press: async (value) => actions.push(["press", value]),
      }),
      waitForSelector: async () => {},
      $$eval: async () => [
        {
          id: "london-advisor",
          firmName: "London Accountants",
          profileUrl:
            "https://proadvisor.intuit.com/app/accountant/search?searchId=london-advisor",
        },
      ],
    };
    const adapter = createQuickBooksAdapter({
      browser: {},
      createContext: async () => ({
        newPage: async () => page,
        close: async () => {},
      }),
      onDiagnostic: (event) => diagnostics.push(event),
    });

    await expect(
      adapter.search({ location: "London, United Kingdom", limit: 10 }),
    ).resolves.toHaveLength(1);
    expect(actions).toEqual([
      ["goto", "https://proadvisor.intuit.com/app/accountant/search?region=uk"],
      ["fill", "London"],
      ["press", "Enter"],
    ]);
    expect(diagnostics).toEqual([
      expect.objectContaining({
        source: "quickbooks",
        location: "London, United Kingdom",
        stage: "search",
        httpStatus: 200,
        contentType: "text/html; charset=utf-8",
        responseSize: 1234,
        parsedItems: 1,
        error: null,
      }),
    ]);
  });

  it("retries a transient QuickBooks navigation timeout", async () => {
    let calls = 0;
    const response = {
      status: () => 200,
      headers: () => ({ "content-type": "text/html; charset=utf-8" }),
    };
    const page = {
      setDefaultTimeout: () => {},
      goto: async () => {
        calls += 1;
        if (calls === 1) throw new Error("navigation timeout");
        return response;
      },
      locator: () => ({ fill: async () => {}, press: async () => {} }),
      waitForSelector: async () => {},
      $$eval: async () => [],
    };
    const adapter = createQuickBooksAdapter({
      browser: {},
      createContext: async () => ({ newPage: async () => page }),
    });
    await expect(
      adapter.search({ location: "London, United Kingdom", limit: 10 }),
    ).resolves.toHaveLength(0);
    expect(calls).toBe(2);
  });

  it("recreates the QuickBooks page after a profile navigation timeout", async () => {
    let pagesCreated = 0;
    let firstPageClosed = false;
    const response = {
      status: () => 200,
      headers: () => ({ "content-type": "text/html; charset=utf-8" }),
    };
    const firstPage = {
      setDefaultTimeout: () => {},
      setDefaultNavigationTimeout: () => {},
      goto: async () => {
        throw new Error("navigation timeout");
      },
      close: async () => {
        firstPageClosed = true;
      },
    };
    const secondPage = {
      setDefaultTimeout: () => {},
      setDefaultNavigationTimeout: () => {},
      goto: async () => response,
      waitForSelector: async () => {},
      evaluate: async () => ({
        id: "profile-1",
        firmName: "Recovered Firm",
        profileUrl: "https://proadvisor.intuit.com/profile-1",
      }),
    };
    const adapter = createQuickBooksAdapter({
      browser: {},
      createContext: async () => ({
        newPage: async () => {
          pagesCreated += 1;
          return pagesCreated === 1 ? firstPage : secondPage;
        },
      }),
    });

    await expect(
      adapter.fetchProfile(
        {
          id: "profile-1",
          profileUrl: "https://proadvisor.intuit.com/profile-1",
        },
        { location: "London, United Kingdom" },
      ),
    ).resolves.toEqual(expect.objectContaining({ firmName: "Recovered Firm" }));
    expect(pagesCreated).toBe(2);
    expect(firstPageClosed).toBe(true);
  });

  it("does not retry deterministic QuickBooks profile failures", async () => {
    let pagesCreated = 0;
    const page = {
      setDefaultTimeout: () => {},
      setDefaultNavigationTimeout: () => {},
      goto: async () => {
        throw Object.assign(new Error("profile not found"), { status: 404 });
      },
      close: async () => {},
    };
    const adapter = createQuickBooksAdapter({
      browser: {},
      createContext: async () => ({
        newPage: async () => {
          pagesCreated += 1;
          return page;
        },
      }),
    });

    await expect(
      adapter.fetchProfile(
        {
          id: "missing-profile",
          profileUrl: "https://proadvisor.intuit.com/missing-profile",
        },
        { location: "London, United Kingdom" },
      ),
    ).rejects.toThrow("profile not found");
    expect(pagesCreated).toBe(1);
  });

  it("keeps QuickBooks search-card data when a profile is unavailable", async () => {
    const diagnostics = [];
    const response = { status: () => 200, headers: () => ({}) };
    const page = {
      setDefaultTimeout: () => {},
      setDefaultNavigationTimeout: () => {},
      goto: async () => response,
      waitForSelector: async () => {
        throw new Error("profile not found");
      },
      close: async () => {},
    };
    const adapter = createQuickBooksAdapter({
      browser: {},
      createContext: async () => ({ newPage: async () => page }),
      onDiagnostic: (event) => diagnostics.push(event),
    });

    await expect(
      adapter.fetchProfile(
        {
          id: "partial-profile",
          fullName: "A. Advisor",
          firmName: "Search Card Accounting",
          address: "10 Example Street, London SW1A 1AA",
          services: ["Bookkeeping"],
          profileUrl:
            "https://proadvisor.intuit.com/app/accountant/searchId=partial-profile",
        },
        { location: "London, United Kingdom" },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        firmName: "Search Card Accounting",
        partialProfile: true,
      }),
    );
    expect(diagnostics.at(-1)).toEqual(
      expect.objectContaining({ partial: true, parsedItems: 1 }),
    );
    expect(adapter.getMetrics()).toEqual(
      expect.objectContaining({ partialProfiles: 1 }),
    );
  });

  it("loads additional QuickBooks result pages until the limit", async () => {
    let pageNumber = 0;
    const response = { status: () => 200, headers: () => ({}) };
    const page = {
      setDefaultTimeout: () => {},
      goto: async () => response,
      locator: () => ({ fill: async () => {}, press: async () => {} }),
      waitForSelector: async () => {},
      $$eval: async () => {
        pageNumber += 1;
        return [
          {
            id: `advisor-${pageNumber}`,
            firmName: `Firm ${pageNumber}`,
            profileUrl: `https://proadvisor.intuit.com/app/accountant/search?searchId=${pageNumber}`,
          },
        ];
      },
      $: async () => (pageNumber < 3 ? { click: async () => {} } : null),
    };
    const adapter = createQuickBooksAdapter({
      browser: {},
      createContext: async () => ({ newPage: async () => page }),
    });
    await expect(
      adapter.search({ location: "London, United Kingdom", limit: 3 }),
    ).resolves.toHaveLength(3);
  });

  it("stops QuickBooks pagination when a page repeats", async () => {
    const response = { status: () => 200, headers: () => ({}) };
    const page = {
      setDefaultTimeout: () => {},
      goto: async () => response,
      locator: () => ({ fill: async () => {}, press: async () => {} }),
      waitForSelector: async () => {},
      $$eval: async () => [
        {
          id: "same-advisor",
          firmName: "Same Firm",
          profileUrl:
            "https://proadvisor.intuit.com/app/accountant/search?searchId=same",
        },
      ],
      $: async () => ({ click: async () => {} }),
    };
    const adapter = createQuickBooksAdapter({
      browser: {},
      createContext: async () => ({ newPage: async () => page }),
    });
    await expect(
      adapter.search({ location: "London, United Kingdom", limit: 3 }),
    ).resolves.toHaveLength(1);
  });

  it("validates, trims, and deduplicates the public input", () => {
    expect(
      validateInput({
        locations: ["Legacy location"],
        sources: ["xero", "xero"],
        maxResults: 25,
      }),
    ).toEqual(
      expect.objectContaining({
        locations: ["Legacy location"],
        sources: ["xero"],
        maxResults: 25,
        enrichWebsites: false,
        extractContacts: true,
        includeRawData: false,
      }),
    );
  });

  it("uses canonical London input when locations are omitted", () => {
    expect(validateInput({ sources: ["quickbooks"] })).toEqual(
      expect.objectContaining({
        locations: ["London, United Kingdom"],
        enrichWebsites: false,
      }),
    );
  });

  it("accepts bounded website enrichment as an explicit opt-in", () => {
    expect(validateInput({ enrichWebsites: true })).toEqual(
      expect.objectContaining({ enrichWebsites: true }),
    );
  });

  it("preserves the requested combined-source result cap", () => {
    expect(
      validateInput({
        locations: ["London"],
        sources: ["xero", "quickbooks"],
        maxResults: 10,
      }).maxResults,
    ).toBe(10);
  });

  it("preserves combined-source requests at the 14-result minimum", () => {
    expect(
      validateInput({
        locations: ["London"],
        sources: ["xero", "quickbooks"],
        maxResults: 14,
      }).maxResults,
    ).toBe(14);
  });

  it("preserves single-source result requests", () => {
    expect(
      validateInput({
        locations: ["London"],
        sources: ["quickbooks"],
        maxResults: 10,
      }).maxResults,
    ).toBe(10);
  });

  it("rejects invalid input bounds and source IDs", () => {
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
        locations: ["Legacy location"],
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
    expect(result.summary.mergeReasons.domain).toBe(1);
    expect(xeroProfileContext).toEqual({
      location: "Legacy location",
    });
    expect(result.summary.effectiveInput).toEqual({
      locations: ["Legacy location"],
      sources: ["xero", "quickbooks"],
      maxResults: 1,
      enrichWebsites: false,
      extractContacts: false,
      includeRawData: false,
    });

    const partial = await runPipeline({
      input: validateInput({
        locations: ["Legacy location"],
        sources: ["xero", "quickbooks"],
      }),
      adapters: { xero, quickbooks: failing },
      now: () => new Date("2026-07-19T08:00:00.000Z"),
    });
    expect(partial.leads).toHaveLength(1);
    expect(partial.summary.sourceFailures.quickbooks).toBe(1);
  });

  it("exposes adapter retry and pagination metrics in the run summary", async () => {
    const makeAdapter = (source, metrics) => ({
      source,
      search: async () => [],
      fetchProfile: async () => null,
      normalize: () => null,
      getMetrics: () => metrics,
    });
    const result = await runPipeline({
      input: validateInput({
        locations: ["London"],
        sources: ["xero", "quickbooks"],
        maxResults: 5,
      }),
      adapters: {
        xero: makeAdapter("xero", { retryAttempts: 1, paginationPages: 0 }),
        quickbooks: makeAdapter("quickbooks", {
          retryAttempts: 2,
          paginationPages: 3,
        }),
      },
    });
    expect(result.summary.retryAttempts).toEqual({ xero: 1, quickbooks: 2 });
    expect(result.summary.paginationPages).toEqual({
      xero: 0,
      quickbooks: 3,
    });
  });

  it("interleaves source jobs before applying the final result cap", async () => {
    const makeAdapter = (source, names) => ({
      source,
      search: async () =>
        names.map((firmName) => ({
          firmName,
          profileUrl: `https://${source}.test/${firmName}`,
        })),
      fetchProfile: async (item) => item,
      normalize: (profile) =>
        lead({
          firmName: profile.firmName,
          sourcePlatforms: [source],
          sourceRecords: [{ source, profileUrl: profile.profileUrl }],
        }),
    });
    const result = await runPipeline({
      input: validateInput({
        locations: ["London, United Kingdom"],
        sources: ["xero", "quickbooks"],
        maxResults: 2,
        extractContacts: false,
      }),
      adapters: {
        xero: makeAdapter("xero", ["Xero One", "Xero Two"]),
        quickbooks: makeAdapter("quickbooks", ["QuickBooks One"]),
      },
    });
    expect(result.leads.map((item) => item.sourcePlatforms[0])).toEqual([
      "xero",
      "quickbooks",
    ]);
  });

  it("enriches one canonical public domain with bounded contact extraction", async () => {
    const requestedUrls = [];
    const homepage = await readFile(
      new URL("../fixtures/website/example-home.html", import.meta.url),
      "utf8",
    );
    const contactPage = await readFile(
      new URL("../fixtures/website/example-contact.html", import.meta.url),
      "utf8",
    );
    const responses = new Map([
      [
        "https://example.com",
        new Response(homepage, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      ],
      [
        "https://example.com/contact",
        new Response(contactPage, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      ],
    ]);
    const enricher = createWebsiteEnricher({
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        return responses.get(url) ?? new Response("missing", { status: 404 });
      },
      timeoutMs: 100,
      delayMs: 0,
    });
    const record = lead({
      website: "https://www.example.com/",
      domain: "example.com",
      sourceRecords: [{ source: "xero", profileUrl: "https://xero.test/a" }],
    });

    const enriched = await enricher.enrich([record]);
    expect(enriched[0].emails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "jane.smith@example.com",
          source: "website",
        }),
        expect.objectContaining({
          email: "accounts@example.com",
          source: "website",
        }),
      ]),
    );
    expect(enriched[0].phoneNumbers).toContain("+4402012345678");
    expect(enriched[0].socialLinks.linkedin).toBe(
      "https://linkedin.com/company/example",
    );
    expect(enriched[0].contacts).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Jane Smith" })]),
    );
    expect(enriched[0].sourceRecords).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: "website" })]),
    );
    expect(requestedUrls).toEqual([
      "https://example.com",
      "https://example.com/contact",
    ]);
    expect(enricher.getMetrics()).toEqual(
      expect.objectContaining({
        attempts: 1,
        successes: 1,
        failures: 0,
        pagesFetched: 2,
        contactsFound: 1,
      }),
    );
  });

  it("deduplicates domains and caps website pages at three", async () => {
    const requestedUrls = [];
    const html =
      '<html><body><a href="/contact">Contact</a><a href="/about">About</a><a href="/team">Team</a><a href="/services">Services</a><p>hello@example.com</p></body></html>';
    const enricher = createWebsiteEnricher({
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
      timeoutMs: 100,
      delayMs: 0,
    });
    const records = [
      lead({
        firmName: "One",
        website: "https://example.com",
        domain: "example.com",
      }),
      lead({
        firmName: "Two",
        website: "https://www.example.com/",
        domain: "example.com",
      }),
    ];

    const enriched = await enricher.enrich(records);
    expect(requestedUrls).toHaveLength(3);
    expect(new Set(requestedUrls)).toEqual(
      new Set([
        "https://example.com",
        "https://example.com/contact",
        "https://example.com/about",
      ]),
    );
    expect(enriched[0].emails).toEqual(enriched[1].emails);
    expect(enricher.getMetrics()).toEqual(
      expect.objectContaining({ attempts: 1, successes: 1, failures: 0 }),
    );
  });

  it("retries transient website responses and reports failed domains", async () => {
    let calls = 0;
    const diagnostics = [];
    const enricher = createWebsiteEnricher({
      fetchImpl: async (url) => {
        calls += 1;
        if (url.includes("missing.example"))
          return new Response("missing", { status: 404 });
        if (calls === 1) return new Response("busy", { status: 503 });
        return new Response("<html><body>ready</body></html>", {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
      timeoutMs: 100,
      delayMs: 0,
      onDiagnostic: (event) => diagnostics.push(event),
    });
    const enriched = await enricher.enrich([
      lead({ website: "https://retry.example", domain: "retry.example" }),
      lead({ website: "https://missing.example", domain: "missing.example" }),
    ]);

    expect(enriched).toHaveLength(2);
    expect(calls).toBe(3);
    expect(enricher.getMetrics()).toEqual(
      expect.objectContaining({
        attempts: 2,
        successes: 1,
        failures: 1,
        retryAttempts: 1,
      }),
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "website", stage: "page" }),
      ]),
    );
  });

  it("runs the website phase before finalizing leads and exposes its metrics", async () => {
    const adapter = {
      source: "xero",
      search: async () => [{ profileUrl: "https://xero.test/example" }],
      fetchProfile: async (item) => item,
      normalize: () =>
        lead({
          website: "https://example.com",
          domain: "example.com",
          sourcePlatforms: ["xero"],
          sourceRecords: [
            { source: "xero", profileUrl: "https://xero.test/example" },
          ],
        }),
    };
    const websiteEnricher = {
      enrich: async (records) => {
        return records.map((record) => ({
          ...record,
          descriptionOriginal: "Website description",
        }));
      },
      getMetrics: () => ({
        attempts: 1,
        successes: 1,
        failures: 0,
        pagesFetched: 1,
        contactsFound: 0,
        retryAttempts: 0,
      }),
    };
    const result = await runPipeline({
      input: validateInput({
        locations: ["London"],
        sources: ["xero"],
        enrichWebsites: true,
      }),
      adapters: { xero: adapter },
      websiteEnricher,
    });

    expect(result.leads[0].descriptionOriginal).toBe("Website description");
    expect(result.leads[0].completenessScore).toBeGreaterThan(25);
    expect(result.summary).toEqual(
      expect.objectContaining({
        websitesEnriched: 1,
        websiteAttempts: 1,
        websiteSuccesses: 1,
        websiteFailures: 0,
        websitePagesFetched: 1,
      }),
    );
  });

  it("keeps the disabled website path directory-only", async () => {
    const adapter = {
      source: "xero",
      search: async () => [{ profileUrl: "https://xero.test/example" }],
      fetchProfile: async (item) => item,
      normalize: () =>
        lead({
          website: "https://example.com",
          domain: "example.com",
          sourcePlatforms: ["xero"],
          sourceRecords: [
            { source: "xero", profileUrl: "https://xero.test/example" },
          ],
        }),
    };
    let called = false;
    const result = await runPipeline({
      input: validateInput({ locations: ["London"], sources: ["xero"] }),
      adapters: { xero: adapter },
      websiteEnricher: {
        enrich: async () => {
          called = true;
          throw new Error("must not run");
        },
      },
    });
    expect(called).toBe(false);
    expect(result.summary).toEqual(
      expect.objectContaining({
        websitesEnriched: 0,
        websiteAttempts: 0,
        websiteSuccesses: 0,
        websiteFailures: 0,
      }),
    );
    expect(result.summary.retryAttempts).toEqual({ xero: 0, quickbooks: 0 });
  });

  it("skips non-HTML responses and bounds website timeouts", async () => {
    const diagnostics = [];
    const nonHtml = createWebsiteEnricher({
      fetchImpl: async () =>
        new Response("{}", {
          headers: { "content-type": "application/json" },
        }),
      timeoutMs: 10,
      delayMs: 0,
      onDiagnostic: (event) => diagnostics.push(event),
    });
    await nonHtml.enrich([
      lead({ website: "https://json.example", domain: "json.example" }),
    ]);
    expect(nonHtml.getMetrics()).toEqual(
      expect.objectContaining({
        attempts: 1,
        successes: 0,
        failures: 1,
        retryAttempts: 0,
      }),
    );

    const timeout = createWebsiteEnricher({
      fetchImpl: () => new Promise(() => {}),
      timeoutMs: 1,
      delayMs: 0,
    });
    await timeout.enrich([
      lead({ website: "https://timeout.example", domain: "timeout.example" }),
    ]);
    expect(timeout.getMetrics()).toEqual(
      expect.objectContaining({ attempts: 1, successes: 0, failures: 1 }),
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "website",
          stage: "page",
          error: expect.any(String),
        }),
      ]),
    );
  });

  it("rejects IP hosts, validates redirects, and ignores malformed entities", async () => {
    let ipCalls = 0;
    const ipEnricher = createWebsiteEnricher({
      fetchImpl: async () => {
        ipCalls += 1;
        return new Response("<html></html>", {
          headers: { "content-type": "text/html" },
        });
      },
      delayMs: 0,
    });
    await ipEnricher.enrich([
      lead({ website: "https://[::1]", domain: "[::1]" }),
    ]);
    expect(ipCalls).toBe(0);
    expect(ipEnricher.getMetrics()).toEqual(
      expect.objectContaining({ attempts: 0, successes: 0, failures: 0 }),
    );

    const redirectUrls = [];
    const redirectEnricher = createWebsiteEnricher({
      fetchImpl: async (url) => {
        redirectUrls.push(url);
        if (url === "https://example.com")
          return new Response("", {
            status: 302,
            headers: { location: "/contact" },
          });
        return new Response(
          "<html><body><p>&#x110000; ready 2025-2026</p></body></html>",
          {
            headers: { "content-type": "text/html" },
          },
        );
      },
      timeoutMs: 100,
      delayMs: 0,
    });
    const redirectLeads = await redirectEnricher.enrich([
      lead({ website: "https://example.com", domain: "example.com" }),
    ]);
    expect(redirectUrls).toEqual([
      "https://example.com",
      "https://example.com/contact",
    ]);
    expect(redirectEnricher.getMetrics()).toEqual(
      expect.objectContaining({
        attempts: 1,
        successes: 1,
        failures: 0,
        pagesFetched: 1,
      }),
    );
    expect(redirectLeads[0].phoneNumbers).toEqual([]);

    let privateRedirectCalls = 0;
    const privateRedirectEnricher = createWebsiteEnricher({
      fetchImpl: async () => {
        privateRedirectCalls += 1;
        return new Response("", {
          status: 302,
          headers: { location: "https://[::1]/private" },
        });
      },
      timeoutMs: 100,
      delayMs: 0,
    });
    await privateRedirectEnricher.enrich([
      lead({ website: "https://redirect.example", domain: "redirect.example" }),
    ]);
    expect(privateRedirectCalls).toBe(1);
    expect(privateRedirectEnricher.getMetrics()).toEqual(
      expect.objectContaining({ attempts: 1, successes: 0, failures: 1 }),
    );
  });
});
