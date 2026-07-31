# Global Xero & QuickBooks Accounting Firm Leads

Find and normalize public accounting firm and advisor profiles from the Xero and QuickBooks directories worldwide. The Actor is designed for accounting-software sales, fintech prospecting, partner research, recruitment, and market analysis.

## Current checkpoint

The Xero and QuickBooks adapters are public-directory implementations. Locations are supplied by the user; UK, US, Australia, and Singapore routes are validated first, while other locations use best-effort routing. Xero parses server-rendered advisor data and visits public profiles, while QuickBooks drives its JavaScript search UI. Website enrichment is reserved for a later phase.

## Input

Use [sample-input.json](sample-input.json):

```json
{
  "locations": ["London, United Kingdom", "Sydney, Australia"],
  "sources": ["xero", "quickbooks"],
  "maxResults": 20,
  "enrichWebsites": false,
  "extractContacts": false,
  "includeRawData": false,
  "proxyConfiguration": { "useApifyProxy": false }
}
```

`locations` accepts 1–20 trimmed, unique cities, regions, postcodes, or countries. The Actor returns at most `maxResults` (1–5,000) final deduplicated leads across all requested jobs. Source jobs are interleaved before the final cap so one directory cannot monopolize the output. `enrichWebsites: true` is rejected until the bounded website-enrichment phase is implemented.

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

Both sources have passed independent London live runs with directory items and profiles fetched. The global contract and source behavior are covered by fixtures and unit tests; live validation for the initial UK/US/Australia/Singapore matrix remains the next benchmark checkpoint. Website enrichment is unavailable, so these are directory-only results. Source diagnostics report the source, location, stage, sanitized requested URL, HTTP status, content type, response size when available, parsed-item count, retry-safe errors, and merge reasons. They never include cookies, tokens, full HTML, or sensitive headers.

## Limitations and responsible use

Coverage and fields are limited to what each public directory route publishes. Xero city pages may expose featured advisors only when their full-results route is unavailable. QuickBooks requires JavaScript/browser interaction and may vary by regional route; rendered pagination is bounded and stops on exhaustion or repeated cards. Network, 429/5xx, and navigation-timeout failures receive bounded retries. No authentication or CAPTCHA bypass is used. Website enrichment is unavailable. The Actor processes public business data only, does not guess emails, and does not infer certifications without explicit source evidence. Users must comply with applicable platform terms, privacy rules, and marketing laws.

## Tiếng Việt

Actor chuẩn hóa hồ sơ công khai của công ty kế toán và chuyên gia theo các địa điểm người dùng cung cấp từ danh bạ Xero và QuickBooks. Đây là đầu ra chỉ từ danh bạ; làm giàu website chưa được bật. Dữ liệu phân loại dùng ID tiếng Anh ổn định, còn nội dung gốc và nguồn dữ liệu được giữ lại. Không đoán email hoặc chứng chỉ; trường không chắc chắn được trả về `null` hoặc mảng rỗng.
