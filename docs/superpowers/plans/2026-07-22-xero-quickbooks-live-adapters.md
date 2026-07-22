# Xero and QuickBooks UK Live Adapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a live Xero UK adapter that returns a normalized London lead, safe source diagnostics, UK locale routing, and an evidence-backed QuickBooks UK investigation/run.

**Architecture:** Resolve location once into source-specific public routes. Use native `fetch` plus Xero's embedded `__NEXT_DATA__` for London search cards, reuse Playwright for client-rendered Xero profiles and QuickBooks, and keep parsing/normalization in pure tested modules. Emit one sanitized diagnostic object at each source boundary and retain effective non-secret input in the run summary.

**Tech Stack:** Node.js 22, Apify SDK 3, Playwright 1.60, Vitest 4, native `fetch`; no new dependencies.

---

## File map

- Create `src/location/locale-resolver.js`: country/locale and source-route resolution.
- Create `src/logging/source-diagnostics.js`: URL/error sanitization and structured event construction.
- Create `src/sources/xero/xero-parser.js`: embedded search JSON parsing and Xero normalization.
- Modify `src/sources/xero/xero-adapter.js`: live HTTP search and Playwright profile extraction.
- Modify `src/sources/quickbooks/quickbooks-adapter.js`: resolved UK route and source diagnostics.
- Modify `src/sources/quickbooks/quickbooks-parser.js`: locale-aware UK/US address normalization.
- Modify `src/pipeline/run.js`: pass locations into profile fetches and retain sanitized effective input.
- Modify `src/main.js`: share browser setup, wire diagnostics, and surface startup failures.
- Create `test/fixtures/xero/london-search.html`: minimal sanitized `__NEXT_DATA__` fixture.
- Create `test/fixtures/xero/london-profile.json`: minimal sanitized rendered-profile fixture.
- Modify `test/unit/core.test.js`: locale, diagnostics, Xero, pipeline, and QuickBooks UK tests.
- Modify `README.md`, `.actor/input_schema.json`, `.actor/output_schema.json`, `sample-input.json`, and `BENCHMARK_NOTES.md` together: accurate defaults, live status, evidence, and blockers.

### Task 1: Resolve UK locale and routes

**Files:**
- Create: `actors/xero-quickbooks-accounting-firm-leads/src/location/locale-resolver.js`
- Test: `actors/xero-quickbooks-accounting-firm-leads/test/unit/core.test.js`

- [ ] **Step 1: Write the failing locale tests**

Add imports and tests:

```js
import { resolveLocation } from "../../src/location/locale-resolver.js";

it("resolves London to UK-specific Xero and QuickBooks routes", () => {
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

it("does not silently label an unknown location as US", () => {
  expect(resolveLocation("Singapore")).toEqual(
    expect.objectContaining({ countryCode: null, locale: null }),
  );
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run test/unit/core.test.js`

Expected: FAIL because `src/location/locale-resolver.js` does not exist.

- [ ] **Step 3: Implement the resolver**

```js
const XERO_LONDON_URL =
  "https://www.xero.com/uk/find-advisors/united-kingdom/england/greater-london/london-city/";
const QUICKBOOKS_URL =
  "https://proadvisor.intuit.com/app/accountant/search";

export const resolveLocation = (query) => {
  const normalized = String(query).trim();
  const lower = normalized.toLocaleLowerCase();
  const isUk = /\b(?:united kingdom|uk|great britain|england)\b/u.test(lower);
  const isLondon = /\blondon\b/u.test(lower);

  return {
    query: normalized,
    city: isLondon ? "London" : null,
    country: isUk || isLondon ? "United Kingdom" : null,
    countryCode: isUk || isLondon ? "GB" : null,
    locale: isUk || isLondon ? "uk" : null,
    xeroSearchUrl: isLondon ? XERO_LONDON_URL : null,
    quickBooksSearchUrl: isUk || isLondon
      ? `${QUICKBOOKS_URL}?region=uk`
      : QUICKBOOKS_URL,
  };
};
```

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run test/unit/core.test.js`

Expected: all locale and existing tests pass.

### Task 2: Add safe structured source diagnostics

**Files:**
- Create: `actors/xero-quickbooks-accounting-firm-leads/src/logging/source-diagnostics.js`
- Test: `actors/xero-quickbooks-accounting-firm-leads/test/unit/core.test.js`

- [ ] **Step 1: Write failing sanitization tests**

```js
import {
  createSourceDiagnostic,
  sanitizeError,
  sanitizeUrl,
} from "../../src/logging/source-diagnostics.js";

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
      error: new Error("bad token=secret\nfull html"),
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
```

- [ ] **Step 2: Verify RED**

Run the unit test and expect a missing-module failure.

- [ ] **Step 3: Implement sanitizers and event construction**

```js
const sensitiveName = /^(?:access_?token|authorization|cookie|key|password|session(?:id)?|token)$/iu;

export const sanitizeUrl = (value) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    for (const name of [...url.searchParams.keys()]) {
      if (sensitiveName.test(name)) url.searchParams.set(name, "REDACTED");
    }
    return url.href;
  } catch {
    return null;
  }
};

export const sanitizeError = (error) =>
  String(error?.message ?? error ?? "Unknown source error")
    .split(/\r?\n/u, 1)[0]
    .replace(/\b(token|cookie|password|authorization|session(?:id)?)=\S+/giu, "$1=REDACTED")
    .slice(0, 500);

export const createSourceDiagnostic = ({
  source,
  location,
  stage,
  requestedUrl,
  status = null,
  contentType = null,
  responseSize = null,
  parsedItems = 0,
  error = null,
}) => ({
  source,
  location,
  stage,
  requestedUrl: sanitizeUrl(requestedUrl),
  httpStatus: status,
  contentType,
  responseSize,
  parsedItems,
  error: error ? sanitizeError(error) : null,
});
```

- [ ] **Step 4: Verify GREEN**

Run the unit test; expect all tests to pass and no secret value in test output.

### Task 3: Parse and normalize sanitized Xero fixtures

**Files:**
- Create: `actors/xero-quickbooks-accounting-firm-leads/test/fixtures/xero/london-search.html`
- Create: `actors/xero-quickbooks-accounting-firm-leads/test/fixtures/xero/london-profile.json`
- Create: `actors/xero-quickbooks-accounting-firm-leads/src/sources/xero/xero-parser.js`
- Test: `actors/xero-quickbooks-accounting-firm-leads/test/unit/core.test.js`

- [ ] **Step 1: Save minimal sanitized fixtures**

The search fixture contains one `__NEXT_DATA__` script with the confirmed public `detail-cards` shape and no headers, cookies, tracking scripts, or unrelated HTML:

```html
<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"main":[{"heading":"Featured advisors","@type":"xero/components/content/detail-cards","items":[{"heading":"Sopher + Co LLP","description":"Accountant · Serves London area · Office in London","links":[{"text":"Find out more","href":"https://www.xero.com/uk/advisors/accountant/sopher-co-71ab8e0c4daf/"}]}]}]}}}</script>
```

The profile fixture contains only public rendered fields:

```json
{
  "id": "80c7ac58-d124-4f14-b21d-71ab8e0c4daf",
  "profileUrl": "https://www.xero.com/advisors/80c7ac58-d124-4f14-b21d-71ab8e0c4daf/",
  "firmName": "Sopher + Co",
  "address": "1-3 Mount Street, 2nd Floor, Connaught House, London, England",
  "experience": ["Platinum partner", "Partner since 2010"],
  "achievements": ["Migration specialist", "Tax expert", "L1 certified associate", "L2 certified professional", "Payroll specialist"],
  "description": "Founded in 1975, we are a progressive firm of chartered accountants and business consultants that offer audit & accounts, tax and general business consultancy services.",
  "industries": ["Accommodation & hospitality", "Construction & trades", "Education", "Finance & insurance", "Healthcare & social services", "Manufacturing"],
  "team": ["Raz Miah", "Antonia Buliga"],
  "socialLinks": { "linkedin": "https://www.linkedin.com/company/sopher---co/", "facebook": "https://www.facebook.com/profile.php?id=311735212304218" }
}
```

- [ ] **Step 2: Write failing parser/normalizer tests**

```js
import {
  normalizeXeroProfile,
  parseXeroSearchHtml,
} from "../../src/sources/xero/xero-parser.js";

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
        "https://www.xero.com/uk/advisors/accountant/sopher-co-71ab8e0c4daf/",
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
  expect(
    normalizeXeroProfile(profile, {
      locationQuery: "London, United Kingdom",
      includeRawData: false,
    }),
  ).toEqual(
    expect.objectContaining({
      firmName: "Sopher + Co",
      advisorNames: ["Raz Miah", "Antonia Buliga"],
      locations: [expect.objectContaining({ city: "London", countryCode: "GB" })],
      services: expect.arrayContaining(["tax", "audit", "business_advisory"]),
      sourcePlatforms: ["xero"],
    }),
  );
});
```

- [ ] **Step 3: Verify RED**

Run the unit test; expect missing Xero parser exports.

- [ ] **Step 4: Implement pure Xero parsing and normalization**

Implement:

```js
import { canonicalizeUrl, domainFromUrl } from "../../normalization/url.js";
import { mapIndustries, mapServices } from "../../taxonomy/taxonomies.js";

const unique = (values) => [...new Set(values.filter(Boolean))];

export const parseXeroSearchHtml = (html, limit) => {
  const match = String(html).match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/iu,
  );
  if (!match) throw new Error("Xero search response has no embedded directory data.");
  const data = JSON.parse(match[1]);
  const cards = (data.props?.pageProps?.main ?? []).find(
    (component) =>
      component?.["@type"] === "xero/components/content/detail-cards" &&
      component?.heading === "Featured advisors",
  );
  return (cards?.items ?? [])
    .map((item) => ({
      id: item.links?.[0]?.href?.match(/-([a-f0-9]{12})\/?$/iu)?.[1] ?? null,
      firmName: item.heading?.trim() ?? null,
      description: item.description?.trim() ?? null,
      profileUrl: canonicalizeUrl(item.links?.[0]?.href),
      source: "xero",
    }))
    .filter((item) => item.firmName && item.profileUrl)
    .slice(0, limit);
};

export const normalizeXeroProfile = (
  profile,
  { locationQuery, includeRawData },
) => {
  const services = mapServices([
    ...(profile.achievements ?? []),
    profile.description,
  ]);
  const website = canonicalizeUrl(profile.website);
  return {
    firmName: profile.firmName,
    advisorNames: unique(profile.team ?? []),
    firmTypes: ["accounting_firm"],
    locations: [{
      address: profile.address ?? null,
      city: /\bLondon\b/iu.test(profile.address ?? "") ? "London" : null,
      region: "England",
      postalCode: null,
      country: "United Kingdom",
      countryCode: "GB",
    }],
    website,
    domain: domainFromUrl(website),
    phoneNumbers: unique(profile.phoneNumbers ?? []),
    emails: [],
    services,
    industriesServed: mapIndustries(profile.industries),
    softwarePlatforms: [{
      platform: "xero",
      relationship: "partner",
      certifications: unique(profile.achievements ?? []),
      specialties: services,
      profileUrl: profile.profileUrl,
      source: "xero",
    }],
    contacts: unique(profile.team ?? []).map((name) => ({
      name, role: null, email: null, phone: null,
      profileUrl: profile.profileUrl, source: "xero",
    })),
    socialLinks: {
      linkedin: profile.socialLinks?.linkedin ?? null,
      facebook: profile.socialLinks?.facebook ?? null,
      instagram: null,
      x: null,
    },
    languages: [],
    descriptionOriginal: profile.description ?? null,
    descriptionNormalized: null,
    sourcePlatforms: ["xero"],
    sourceRecords: [{ source: "xero", profileUrl: profile.profileUrl, locationQuery }],
    rawData: includeRawData ? { xero: { id: profile.id, experience: profile.experience, achievements: profile.achievements } } : null,
  };
};
```

- [ ] **Step 5: Verify GREEN**

Run the unit test and expect all tests to pass.

### Task 4: Implement the live Xero adapter

**Files:**
- Modify: `actors/xero-quickbooks-accounting-firm-leads/src/sources/xero/xero-adapter.js`
- Test: `actors/xero-quickbooks-accounting-firm-leads/test/unit/core.test.js`

- [ ] **Step 1: Write a failing adapter search test with an injected fetch**

```js
import { createXeroAdapter } from "../../src/sources/xero/xero-adapter.js";

it("uses the resolved London URL and reports safe search metadata", async () => {
  const html = await readFile(
    new URL("../fixtures/xero/london-search.html", import.meta.url), "utf8",
  );
  const diagnostics = [];
  const adapter = createXeroAdapter({
    fetchImpl: async (url) => new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    }),
    onDiagnostic: (event) => diagnostics.push(event),
  });
  const items = await adapter.search({
    location: "London, United Kingdom",
    limit: 10,
  });
  expect(items).toHaveLength(1);
  expect(diagnostics[0]).toEqual(expect.objectContaining({
    source: "xero", stage: "search", httpStatus: 200, parsedItems: 1,
  }));
});
```

- [ ] **Step 2: Verify RED**

Run the unit test; expect `createXeroAdapter` to be missing.

- [ ] **Step 3: Implement fetch search and lazy browser profile extraction**

Replace the placeholder with a factory that:

```js
import { createSourceDiagnostic } from "../../logging/source-diagnostics.js";
import { resolveLocation } from "../../location/locale-resolver.js";
import { normalizeXeroProfile, parseXeroSearchHtml } from "./xero-parser.js";

export const createXeroAdapter = ({
  browser,
  createContext,
  fetchImpl = fetch,
  onDiagnostic = () => {},
}) => {
  let context;
  let page;
  const getPage = async () => {
    if (!browser || !createContext) throw new Error("Xero profile browser is unavailable.");
    if (!context) context = await createContext(browser);
    if (!page) page = await context.newPage();
    page.setDefaultTimeout(30_000);
    return page;
  };

  return {
    source: "xero",
    search: async ({ location, limit }) => {
      const requestedUrl = resolveLocation(location).xeroSearchUrl;
      if (!requestedUrl) throw new Error(`No supported Xero route for ${location}.`);
      let response;
      try {
        response = await fetchImpl(requestedUrl, {
          headers: { accept: "text/html,application/xhtml+xml" },
          redirect: "follow",
        });
        const html = await response.text();
        const items = parseXeroSearchHtml(html, limit);
        onDiagnostic(createSourceDiagnostic({
          source: "xero", location, stage: "search", requestedUrl,
          status: response.status,
          contentType: response.headers.get("content-type"),
          responseSize: Buffer.byteLength(html), parsedItems: items.length,
        }));
        if (!response.ok) throw new Error(`Xero search returned HTTP ${response.status}.`);
        return items;
      } catch (error) {
        onDiagnostic(createSourceDiagnostic({
          source: "xero", location, stage: "search", requestedUrl,
          status: response?.status ?? null,
          contentType: response?.headers.get("content-type") ?? null,
          error,
        }));
        throw error;
      }
    },
    fetchProfile: async (item, { location } = {}) => {
      const activePage = await getPage();
      const response = await activePage.goto(item.profileUrl, { waitUntil: "domcontentloaded" });
      await activePage.locator("main h1").waitFor();
      const profile = await activePage.evaluate(({ fallbackName }) => {
        const main = document.querySelector("main");
        const heading = (name) => [...main.querySelectorAll("h2")]
          .find((node) => node.textContent.trim() === name);
        const sectionValues = (name, selector = "h3") => {
          const title = heading(name);
          const section = title?.parentElement;
          return section ? [...section.querySelectorAll(selector)]
            .map((node) => node.textContent.trim()).filter(Boolean) : [];
        };
        const firmName = main.querySelector("h1")?.textContent.trim() || fallbackName;
        const address = main.querySelector("h1")?.nextElementSibling?.textContent.trim() ?? null;
        const about = heading("About us")?.nextElementSibling?.textContent.trim() ?? null;
        const social = (label) => main.querySelector(`a[aria-label^="${label}"]`)?.href ?? null;
        return {
          id: location.pathname.split("/").filter(Boolean).at(-1),
          profileUrl: location.href,
          firmName,
          address,
          experience: sectionValues("Experience"),
          achievements: sectionValues("Xero achievements"),
          description: about,
          industries: sectionValues("Industries", "[class*='tag']"),
          team: sectionValues("Meet the team"),
          socialLinks: { linkedin: social("LinkedIn"), facebook: social("Facebook") },
        };
      }, { fallbackName: item.firmName });
      onDiagnostic(createSourceDiagnostic({
        source: "xero", location, stage: "profile", requestedUrl: item.profileUrl,
        status: response?.status() ?? null,
        contentType: response?.headers()["content-type"] ?? null,
        parsedItems: profile.firmName ? 1 : 0,
      }));
      return profile;
    },
    normalize: normalizeXeroProfile,
    close: async () => context?.close(),
  };
};
```

- [ ] **Step 4: Verify GREEN**

Run unit tests. Keep browser DOM selectors confined to `main`; do not log HTML or headers.

### Task 5: Wire adapters, effective input, and failure visibility

**Files:**
- Modify: `actors/xero-quickbooks-accounting-firm-leads/src/pipeline/run.js`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/src/main.js`
- Test: `actors/xero-quickbooks-accounting-firm-leads/test/unit/core.test.js`

- [ ] **Step 1: Write failing pipeline expectations**

Extend the mocked pipeline test:

```js
expect(result.summary.effectiveInput).toEqual({
  locations: ["London"],
  sources: ["xero", "quickbooks"],
  maxResults: 1,
  enrichWebsites: false,
  extractContacts: false,
  includeRawData: false,
});
```

Also make the mock `fetchProfile` assert that it receives `{ location: "London" }`.

- [ ] **Step 2: Verify RED**

Run the unit test; expect missing `effectiveInput` and profile context.

- [ ] **Step 3: Add effective input and profile context in the pipeline**

Add to the summary:

```js
effectiveInput: {
  locations: [...input.locations],
  sources: [...input.sources],
  maxResults: input.maxResults,
  enrichWebsites: input.enrichWebsites,
  extractContacts: input.extractContacts,
  includeRawData: input.includeRawData,
},
```

Change profile fetch to:

```js
const profile = await adapter.fetchProfile(item, { location });
```

- [ ] **Step 4: Wire a shared browser and structured logs in `main.js`**

Replace the static Xero adapter import and setup with `createXeroAdapter`. Launch Chromium when either source is requested, construct both requested adapters, and pass:

```js
const onDiagnostic = (event) => {
  const message = `${event.source} ${event.stage}`;
  if (event.error) log.warning(message, event);
  else log.info(message, event);
};
```

Wrap execution with `catch (error) { log.exception(error, "Actor failed before producing output."); throw error; }` before `finally`, close every adapter context, then close the browser. Do not call `Actor.exit()` in a way that converts a thrown startup error into a successful exit.

- [ ] **Step 5: Verify GREEN**

Run unit tests and `npm run build`; expect both to pass.

### Task 6: Validate Xero independently before QuickBooks UK work

**Files:**
- Modify after evidence: `actors/xero-quickbooks-accounting-firm-leads/BENCHMARK_NOTES.md`

- [ ] **Step 1: Run static validation**

Run:

```bash
npm run lint
npm test
npm run build
npm run format:check
apify validate-schema
```

Expected: all commands exit 0.

- [ ] **Step 2: Run Xero alone with the required input**

Run:

```bash
APIFY_STORAGE_DIR=/tmp/apify-xero-london-live apify run --purge --input '{"locations":["London, United Kingdom"],"sources":["xero"],"maxResults":10,"enrichWebsites":false,"extractContacts":false,"includeRawData":false,"proxyConfiguration":{"useApifyProxy":false}}'
```

Expected summary: `searchJobs: 1`, `directoryItemsFound >= 1`, `profilesFetched >= 1`, `uniqueFirms >= 1`, `resultsPushed >= 1`, `sourceFailures.xero: 0`.

- [ ] **Step 3: Inspect the local result**

Read the generated `OUTPUT.json` and first dataset item. Confirm `primaryCity: "London"`, `primaryCountryCode: "GB"`, `hasXeroProfile: true`, `contacts: []`, and Xero source provenance. Do not proceed to QuickBooks if any condition fails; return to the failing Xero test/implementation task.

- [ ] **Step 4: Record sanitized Xero evidence**

Add the date, requested public route, status/content type/response size, counts, and normalized firm name to benchmark notes. Do not include cookies, tokens, sensitive headers, or raw HTML.

### Task 7: Investigate and adapt QuickBooks UK

**Files:**
- Modify: `actors/xero-quickbooks-accounting-firm-leads/src/sources/quickbooks/quickbooks-adapter.js`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/src/sources/quickbooks/quickbooks-parser.js`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/test/unit/core.test.js`
- Modify: `actors/xero-quickbooks-accounting-firm-leads/BENCHMARK_NOTES.md`

- [ ] **Step 1: Capture sanitized browser evidence from the UK route**

Run a one-page Playwright diagnostic against `https://proadvisor.intuit.com/app/accountant/search?region=uk`. Record only response URL after sensitive-query redaction, status, content type, response size, DOM selector counts, and whether results require a cookie choice, location selection, pagination, XHR, or browser rendering. Stop and document if authentication, CAPTCHA, or access controls appear.

- [ ] **Step 2: Write failing UK route/address tests**

```js
import { parseQuickBooksAddress } from "../../src/sources/quickbooks/quickbooks-parser.js";

it("normalizes a QuickBooks UK address without forcing US fields", () => {
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
});
```

Add an adapter test with injected page/context objects asserting navigation uses `resolveLocation(location).quickBooksSearchUrl`.

- [ ] **Step 3: Verify RED**

Run the unit test; expect the exported locale-aware address parser and route behavior to be missing.

- [ ] **Step 4: Implement locale-aware QuickBooks behavior**

Export `parseQuickBooksAddress(addressLines, resolvedLocation)`. Preserve the existing US regex when `countryCode === "US"`; for GB, extract the terminal postcode with `/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/iu`, remove it from the last line to derive city, and never invent a region.

In adapter search:

```js
const requestedUrl = resolveLocation(location).quickBooksSearchUrl;
const response = await activePage.goto(requestedUrl, { waitUntil: "domcontentloaded" });
```

Emit search/profile diagnostics with the same safe event builder. Pass the resolved location into normalization and use `parseQuickBooksAddress` instead of the hard-coded US parser.

- [ ] **Step 5: Verify GREEN**

Run unit tests and build; expect all to pass.

- [ ] **Step 6: Run QuickBooks alone with the required London input**

Run the same Actor command as Task 6 with `sources: ["quickbooks"]` and a separate `/tmp` storage directory. Record counts or the precise sanitized blocker, including cookie, region, pagination, XHR, or browser requirements. Do not bypass authentication, CAPTCHA, or access controls.

### Task 8: Align public contract and complete validation

**Files:**
- Modify together: `actors/xero-quickbooks-accounting-firm-leads/README.md`
- Modify together: `actors/xero-quickbooks-accounting-firm-leads/.actor/input_schema.json`
- Modify together: `actors/xero-quickbooks-accounting-firm-leads/.actor/output_schema.json`
- Modify together: `actors/xero-quickbooks-accounting-firm-leads/sample-input.json`
- Modify together: `actors/xero-quickbooks-accounting-firm-leads/BENCHMARK_NOTES.md`

- [ ] **Step 1: Update all contract documents together**

Set the `enrichWebsites` schema default to `false`; use `enrichWebsites: false` and `extractContacts: false` in the validation sample. Describe Xero's server-rendered London search plus browser-rendered profile behavior, QuickBooks UK's observed requirements, structured safe logs, and `effectiveInput`. Remove statements that Xero is disabled or that London has been validated when evidence does not support them.

- [ ] **Step 2: Run the complete quality gate**

Run:

```bash
npm run lint
npm test
npm run build
npm run format:check
apify validate-schema
git diff --check
```

Expected: all exit 0.

- [ ] **Step 3: Run the final local Actor validation**

Run Xero-only, QuickBooks-only, and then both sources with London, `maxResults: 10`, website enrichment off, and contacts off. Preserve each run in a separate `/tmp` storage directory. Confirm each emitted summary matches the effective input and inspect every dataset record for source/locale consistency.

- [ ] **Step 4: Review the final diff and report**

Report Xero and QuickBooks root causes, all changed files, per-source summaries, blockers, test/Actor validation evidence, and the exact next command. Do not publish, push, or change pricing.
