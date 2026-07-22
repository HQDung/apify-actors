# Xero & QuickBooks Accounting Firm Leads

Find and normalize public accounting firm and advisor profiles from Xero and QuickBooks directories worldwide. The Actor is designed for accounting-software sales, fintech prospecting, partner research, recruitment, and market analysis.

## Current checkpoint

Phase 1 provides the validated public contract, language-neutral models, taxonomies, conservative deduplication, completeness scoring, and a dependency-injected pipeline. The QuickBooks adapter returns normalized public US ProAdvisor search and profile records. Xero remains disabled because its current public search component did not expose a stable response during validation. Website enrichment is the next gated phase and is not implemented yet.

## Input

Use [sample-input.json](sample-input.json):

```json
{
  "locations": ["London, United Kingdom"],
  "sources": ["xero", "quickbooks"],
  "maxResults": 100,
  "enrichWebsites": true,
  "extractContacts": true,
  "includeRawData": false,
  "proxyConfiguration": { "useApifyProxy": true }
}
```

Locations are trimmed and deduplicated case-insensitively. The Actor accepts 1–20 locations and returns at most `maxResults` (1–5,000) final deduplicated leads.

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

QuickBooks has passed a one-result local live smoke test. Validate again before a benchmark or cloud run.

## Limitations and responsible use

Directory coverage and fields vary by country. QuickBooks currently parses the first rendered result page and its US address format; pagination and other country formats remain future work. Xero and website enrichment are not implemented at this checkpoint. The Actor processes public business data only, does not bypass authentication or CAPTCHA, does not guess emails, and does not infer certifications without explicit source evidence. Users must comply with applicable platform terms, privacy rules, and marketing laws.

## Tiếng Việt

Actor chuẩn hóa hồ sơ công khai của công ty kế toán và chuyên gia từ danh bạ Xero và QuickBooks. Dữ liệu phân loại dùng ID tiếng Anh ổn định, còn nội dung gốc và nguồn dữ liệu được giữ lại. Không đoán email hoặc chứng chỉ; trường không chắc chắn được trả về `null` hoặc mảng rỗng.
