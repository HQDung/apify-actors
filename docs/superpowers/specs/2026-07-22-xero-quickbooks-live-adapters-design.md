# Xero and QuickBooks UK Live Adapter Design

## Goal

Replace the disabled Xero source with a validated live UK implementation, add UK locale routing, improve safe source diagnostics, and investigate QuickBooks UK only after Xero produces a normalized London lead.

## Confirmed root causes

- The Xero adapter is a checkpoint placeholder whose `search` method always throws.
- Xero's public London city page is server-rendered HTML with matching `__NEXT_DATA__` and five featured advisor cards. Its linked full-results route currently returns Xero's 404 page.
- Xero profile pages render a shell, redirect to a UUID URL, and then load public profile data from Coveo JSON before rendering the profile DOM.
- The QuickBooks adapter is a live Playwright implementation, but it uses the unscoped ProAdvisor route and assumes US address formatting. QuickBooks UK's public entry point adds `?region=uk`.
- Inline local Actor input is not reflected in the older stored `INPUT.json`, so a successful New York QuickBooks result was easy to mistake for a London two-source result.

## Architecture

### Locale resolution

Add a focused resolver that recognizes United Kingdom aliases and known UK cities. It returns country code `GB`, locale `uk`, and source-specific routes. `London, United Kingdom` resolves to Xero's London city landing page and QuickBooks' `?region=uk` search page. Unsupported locations retain an explicit generic route rather than silently inheriting US normalization.

### Safe source diagnostics

Each source operation emits a structured event containing source, location, stage, requested URL, HTTP status, content type, response size, parsed item count, and sanitized error message. URL credentials and sensitive query values are redacted. Cookies, tokens, authorization values, full HTML, response bodies, and sensitive headers are never logged.

The final summary also records a sanitized effective run configuration so inline local runs can be distinguished from stale local `INPUT.json` files.

### Xero adapter

Search uses native `fetch` against the resolved UK landing page. It validates status and content type, extracts `__NEXT_DATA__`, and parses public featured-advisor cards up to the requested limit. The parser rejects incomplete cards and canonicalizes profile URLs.

Profile fetching uses the existing Playwright dependency because the live page renders profile data after a public Coveo request. It waits for a resolved advisor heading, extracts only public rendered fields, and reports response metadata without capturing request credentials or bodies. The normalizer produces a UK location, Xero relationship, achievements, team members, industries, description, and source provenance. No authentication, CAPTCHA, or access controls are bypassed.

Sanitized fixtures contain only the minimal HTML/JSON fragments needed to represent the public London landing cards and one rendered London profile. They exclude cookies, headers, tracking payloads, and unrelated page content.

### QuickBooks investigation

QuickBooks work begins only after an independent Xero London run has positive directory and profile counts and at least one normalized lead. Investigation starts from `https://proadvisor.intuit.com/app/accountant/search?region=uk` and records whether results depend on rendered HTML, embedded JSON, XHR, cookies, pagination, or browser state.

If the public UK flow remains accessible without authentication or CAPTCHA, the existing browser adapter receives the smallest route and parser changes needed for UK results. Otherwise, the exact browser, region, cookie, pagination, or access blocker is documented and the adapter fails with actionable sanitized diagnostics.

### Website enrichment gate

Website enrichment remains disabled during live-source validation. README, input schema, sample input, output schema where applicable, and benchmark notes are updated together so defaults and documentation do not imply enrichment is active before both `directoryItemsFound` and `profilesFetched` are positive.

## Data flow

1. Validate input and resolve country/locale per location.
2. Run one source search with structured request/response diagnostics.
3. Parse and count directory items.
4. Fetch each public profile and count successful profiles.
5. Normalize, validate, deduplicate, and push leads.
6. Store a summary containing counters and sanitized effective input.
7. Keep enrichment off until the directory/profile gate passes.

## Error handling

- HTTP failures include sanitized URL, status, content type, and response size when available.
- Parser failures include stage and parsed count but never include raw source content.
- Browser launch and startup failures reach the same failure-reporting path instead of being hidden by shutdown.
- A source failure remains isolated so partial results from another source can complete.
- A 404 full-results route is not retried through guessed URLs; Xero uses the confirmed London landing page contract.

## Testing and validation

Implementation follows test-first cycles:

- Locale resolver tests for London and UK aliases.
- Log sanitization and structured metadata tests.
- Xero landing fixture parser tests.
- Xero rendered-profile fixture parser and normalization tests.
- Pipeline summary tests for effective input and source diagnostics.
- QuickBooks UK route/address tests only after Xero live validation.

Validation order:

1. Run unit tests, lint, build, formatting, and Actor schema validation.
2. Run Xero alone for London with `maxResults: 10`, `enrichWebsites: false`, and `extractContacts: false`; require at least one item, profile, and normalized result.
3. Investigate and run QuickBooks alone with the same London settings.
4. Run the Actor locally with both sources only after independent runs are understood.
5. Update benchmark notes with observed counts and blockers.

No publishing, pricing changes, new dependencies, authentication bypass, CAPTCHA bypass, or automatic website enrichment are in scope.
