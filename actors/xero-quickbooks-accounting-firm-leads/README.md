# Global Xero & QuickBooks Accounting Firm Leads

Find and normalize public accounting firm and advisor profiles from the Xero and QuickBooks directories worldwide. The Actor is designed for accounting-software sales, fintech prospecting, partner research, recruitment, and market analysis.

## Current checkpoint

The Xero and QuickBooks adapters are public-directory implementations. Locations are supplied by the user; UK, US, Australia, and Singapore routes are validated first, while other locations use best-effort routing. Xero parses server-rendered advisor data and visits public profiles, while QuickBooks drives its JavaScript search UI. Website enrichment is available as an explicit opt-in and remains disabled by default.

## Input

Use [sample-input.json](sample-input.json):

```json
{
  "locations": ["London, United Kingdom"],
  "sources": ["xero", "quickbooks"],
  "maxResults": 20,
  "enrichWebsites": false,
  "extractContacts": false,
  "includeRawData": false,
  "proxyConfiguration": { "useApifyProxy": false }
}
```

`locations` accepts 1–20 trimmed, unique cities, regions, postcodes, or countries. The Actor returns at most `maxResults` (1–5,000) final deduplicated leads across all requested jobs. Source jobs are interleaved before the final cap so one directory cannot monopolize the output. Set `enrichWebsites: true` to inspect published website data for the capped final lead set; `false` keeps the directory-only path unchanged.

When enabled, each canonical public domain is fetched at most once, for a maximum of three HTML pages (homepage plus same-domain contact/about/team candidates), with a 10-second page deadline, a 30-second domain budget, two retries, abortable requests, same-domain redirect validation, non-HTML skipping, and low concurrency. Only explicit emails, phones, `mailto:` contact names, social links, descriptions, services, and industries are retained. A failed website never removes directory data. Website page URLs are retained in `sourceRecords`, and `OUTPUT` reports attempts, successes, failures, pages, emails, phones, services, industries, contacts, and domain timeouts.

## API example

```bash
apify call xero-quickbooks-accounting-firm-leads \
  --input-file sample-input.json
```

## Output fields

| Field                  | Type           | Description                                      |
| ---------------------- | -------------- | ------------------------------------------------ |
| `firmName`             | string         | Normalized public firm or advisor name           |
| `primaryCountry`       | string or null | Convenience value from the first public location |
| `primaryCity`          | string or null | Convenience value from the first public location |
| `website`              | string or null | Website published by the public directory        |
| `primaryEmail`         | string or null | First public business email                      |
| `primaryPhone`         | string or null | First public business phone                      |
| `services`             | string[]       | Stable English machine-readable service IDs      |
| `industriesServed`     | string[]       | Stable English machine-readable industry IDs     |
| `hasXeroProfile`       | boolean        | Whether Xero provenance exists                   |
| `hasQuickBooksProfile` | boolean        | Whether QuickBooks provenance exists             |
| `completenessScore`    | integer        | Deterministic data completeness from 0–100       |
| `scrapedAt`            | string         | ISO timestamp                                    |

Full records also retain advisor names, firm types, locations, emails with sources, contacts, social links, software relationships, languages, descriptions, source records, and optional compact raw data.

The completeness formula awards: firm name 5, directory profile 10, website/domain 15, public email 15, public phone 10, full location 10, service 10, industry 5, certification/specialty 10, contact person 5, and description 5.

## Local checks

```bash
npm install
npm run lint
npm test
npm run build
apify validate-schema
```

Both sources have passed independent London live runs with directory items and profiles fetched. Build 0.1.6 completed the 15-case UK/US/Australia/Singapore cloud matrix; Xero had three isolated profile-render misses, while QuickBooks completed all search jobs without source failures. That gate used directory-only inputs; website enrichment is separately opt-in and bounded as described above. Source diagnostics report the source, location, stage, sanitized requested URL, HTTP status, content type, response size when available, parsed-item count, retry-safe errors, and merge reasons. They never include cookies, tokens, full HTML, or sensitive headers.

## Reliability-gate matrix

Run the serial 15-case local matrix after the checks above:

```bash
node validation/run-global-matrix.mjs --mode local
```

It covers each source in London, New York, Sydney, and Singapore; combined-source runs; and a three-run QuickBooks London soak. Each case uses five results, directory-only mode, contacts/raw data disabled, and proxy disabled. Results include runtime, a `resultClass` (`usable_results`, `no_public_results`, `source_failure`, or `profile_failures`), rows, firm-name/profile URL coverage, duplicate domains, completeness, search-job failures, retries, and rendered pagination pages. Build 0.1.6 completed all 15 cases successfully; the runner never edits benchmark notes or publishes an Actor.

`OUTPUT` exposes `retryAttempts`, `paginationPages`, and `partialProfiles` keyed by source, plus `websiteAttempts`, `websiteSuccesses`, `websiteFailures`, `websitePagesFetched`, `websiteEmailsFound`, `websitePhonesFound`, and `websiteContactsFound` when enrichment is enabled. QuickBooks retries the complete profile navigation/render/evaluation transaction and recreates the browser page after retryable navigation or timeout failures; deterministic 4xx/profile-not-found errors are not retried. If a public profile page remains unavailable, the adapter preserves the search-card firm name, address, services, and profile URL as a marked partial profile.

Website runs also expose `websiteServicesFound`, `websiteIndustriesFound`, and `websiteDomainTimeouts`. Website-derived emails include their page URL; page-level provenance is retained in `sourceRecords`.

## Example output

```json
{
  "firmName": "Example Accounting Partners",
  "website": "https://example-accounting.com",
  "domain": "example-accounting.com",
  "primaryEmail": "hello@example-accounting.com",
  "services": ["bookkeeping", "tax"],
  "industriesServed": ["construction"],
  "hasXeroProfile": true,
  "hasQuickBooksProfile": true,
  "sourcePlatforms": ["xero", "quickbooks", "website"],
  "sourceRecords": [
    { "source": "xero", "profileUrl": "https://www.xero.com/..." },
    { "source": "website", "profileUrl": "https://example-accounting.com" }
  ],
  "completenessScore": 88,
  "scrapedAt": "2026-07-31T00:00:00.000Z"
}
```

## Limitations and responsible use

Coverage and fields are limited to what each public directory route publishes. Xero city pages may expose featured advisors only when their full-results route is unavailable; build 0.1.6 had one profile-render miss in each of New York, Sydney, and Singapore. QuickBooks requires JavaScript/browser interaction and may vary by regional route; rendered pagination is bounded and stops on exhaustion or repeated cards. Network, 429/5xx, and navigation-timeout failures receive bounded retries. Website enrichment is opt-in, limited to canonical public domains and three HTML pages per domain; timeouts, non-HTML responses, and other failures preserve directory-only fields. No authentication or CAPTCHA bypass is used. The Actor processes public business data only, does not guess emails, and does not infer certifications without explicit source evidence. Users must comply with applicable platform terms, privacy rules, and marketing laws.

## Tiếng Việt

Actor chuẩn hóa hồ sơ công khai của công ty kế toán và chuyên gia theo các địa điểm người dùng cung cấp từ danh bạ Xero và QuickBooks. Làm giàu website là tùy chọn, có giới hạn và mặc định tắt; lỗi website vẫn giữ dữ liệu từ danh bạ. Dữ liệu phân loại dùng ID tiếng Anh ổn định, còn nội dung gốc và nguồn dữ liệu được giữ lại. Không đoán email hoặc chứng chỉ; trường không chắc chắn được trả về `null` hoặc mảng rỗng.
