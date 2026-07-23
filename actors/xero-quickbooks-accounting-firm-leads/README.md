# Xero & QuickBooks Accounting Firm Leads

Find and normalize public accounting firm and advisor profiles from Xero and QuickBooks directories worldwide. The Actor is designed for accounting-software sales, fintech prospecting, partner research, recruitment, and market analysis.

## Current checkpoint

The Xero and QuickBooks adapters are live public-directory implementations. London resolves to UK-specific routes: Xero parses the server-rendered advisor data and visits public profiles, while QuickBooks drives its JavaScript search UI and public GraphQL-backed results. Website enrichment remains disabled by default and is not implemented yet.

## Input

Use [sample-input.json](sample-input.json):

```json
{
  "locations": ["London, United Kingdom"],
  "sources": ["xero", "quickbooks"],
  "maxResults": 14,
  "enrichWebsites": false,
  "extractContacts": false,
  "includeRawData": false,
  "proxyConfiguration": { "useApifyProxy": false }
}
```

Locations are trimmed and deduplicated case-insensitively. The Actor accepts 1–20 locations and returns at most `maxResults` (1–5,000) final deduplicated leads. When both Xero and QuickBooks are selected, a `maxResults` value below 14 is automatically normalized to 14 so both directories can contribute; single-source runs use the configured value unchanged.

## Output fields

| Field                  | Type           | Description                                      |
| ---------------------- | -------------- | ------------------------------------------------ |
| `firmName`             | string         | Normalized public firm or advisor name           |
| `primaryCountry`       | string or null | Convenience value from the first public location |
| `primaryCity`          | string or null | Convenience value from the first public location |
| `website`              | string or null | Canonical public firm website                    |
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

Both sources have passed independent London live runs with directory items and profiles fetched. Source diagnostics report the source, location, stage, sanitized requested URL, HTTP status, content type, response size when available, parsed-item count, and sanitized error. They never include cookies, tokens, full HTML, or sensitive headers.

## Limitations and responsible use

Directory coverage and fields vary by country. Xero's UK city page currently exposes five featured advisors; its full-results link returns 404. QuickBooks currently parses the first rendered result page; cursor pagination is not implemented. The QuickBooks UK directory requires JavaScript/browser interaction, a UK region parameter, a city-only location term, and a short debounced search wait; no cookie acceptance, authentication, or CAPTCHA bypass was required. Website enrichment is not implemented. The Actor processes public business data only, does not bypass authentication or CAPTCHA, does not guess emails, and does not infer certifications without explicit source evidence. Users must comply with applicable platform terms, privacy rules, and marketing laws.

## Tiếng Việt

Actor chuẩn hóa hồ sơ công khai của công ty kế toán và chuyên gia từ danh bạ Xero và QuickBooks. Dữ liệu phân loại dùng ID tiếng Anh ổn định, còn nội dung gốc và nguồn dữ liệu được giữ lại. Không đoán email hoặc chứng chỉ; trường không chắc chắn được trả về `null` hoặc mảng rỗng.
