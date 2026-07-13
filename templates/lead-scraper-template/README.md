# {{ACTOR_TITLE}}

{{LONG_DESCRIPTION}}

This Actor extracts business information such as name, category, rating, address, phone number, website, email, and Google Maps URL.

## Positioning

- **Target user:** {{TARGET_USER}}
- **Buyer pain point:** {{BUYER_PAIN_POINT}}
- **Differentiation:** {{DIFFERENTIATION}}

## Benchmark inputs

Use these labeled profiles for repeatable local and performance checks. All profiles keep Apify Proxy disabled by default.

{{BENCHMARKS_NOTE}}

```json
{{BENCHMARK_INPUTS_JSON}}
```

## Features

- Scrape Google Maps business search results
- Extract business name, category, rating, address, phone number and website
- Extract emails from business websites
- Deduplicate repeated Google Maps results
- Add `hasEmail`, `leadScore` and `leadQuality`
{{#MULTI_SEARCH}}
- Search multiple {{SEARCH_TYPE_DOC_LABEL}}s per {{SEARCH_LOCATION_DOC_LABEL}}
{{/MULTI_SEARCH}}
{{^MULTI_SEARCH}}
- Support custom keyword and location
{{/MULTI_SEARCH}}
- Support parallel processing

## Input

```json
{{SAMPLE_INPUT_JSON}}
```

## Input fields

| Field | Type | Description |
|---|---|---|
{{#MULTI_SEARCH}}
| `{{SEARCH_LOCATION_INPUT_FIELD}}` | string | {{SEARCH_LOCATION_INPUT_DESCRIPTION}} |
| `{{SEARCH_TYPE_INPUT_FIELD}}` | string[] | {{SEARCH_TYPE_INPUT_DESCRIPTION}} |
| `{{MAX_RESULTS_INPUT_FIELD}}` | integer | {{MAX_RESULTS_INPUT_DESCRIPTION}} |
{{/MULTI_SEARCH}}
{{^MULTI_SEARCH}}
| `keyword` | string | Search keyword for {{NICHE_PLURAL}} |
| `location` | string | Target city or area, for example `{{DEFAULT_LOCATION}}` or `Ho Chi Minh` |
| `maxResults` | integer | Maximum number of businesses to scrape |
{{/MULTI_SEARCH}}
| `batchSize` | integer | Number of business detail pages processed in parallel |
| `extractEmails` | boolean | Whether to extract email addresses from business websites |
{{#MULTI_SEARCH}}
| `useProxy` | boolean | Whether to use Apify Proxy for browser requests |

Legacy `keyword`, `location`, `maxResults` and `useApifyProxy` inputs are still accepted for backward compatibility.
{{/MULTI_SEARCH}}
{{^MULTI_SEARCH}}
| `useApifyProxy` | boolean | Whether to use Apify Proxy for browser requests |
{{/MULTI_SEARCH}}

## Output

```json
{
  "{{SEARCH_TYPE_OUTPUT_FIELD}}": "{{DEFAULT_KEYWORD}}",
  "{{SEARCH_LOCATION_OUTPUT_FIELD}}": "{{DEFAULT_LOCATION}}",
  "name": "Example {{NICHE}}",
  "rating": "4.5",
  "category": "{{NICHE}}",
  "address": "{{DEFAULT_LOCATION}}, Vietnam",
  "website": "https://example.com",
  "phone": "+84 123 456 789",
  "email": "info@example.com",
  "emails": ["info@example.com"],
  "hasEmail": true,
  "leadScore": 95,
  "leadQuality": "high",
  "googleMapsUrl": "https://www.google.com/maps/place/..."
}
```

## Output fields

| Field | Type | Description |
|---|---|---|
| `{{SEARCH_TYPE_OUTPUT_FIELD}}` | string | {{SEARCH_TYPE_OUTPUT_LABEL}} used to find the lead |
| `{{SEARCH_LOCATION_OUTPUT_FIELD}}` | string | {{SEARCH_LOCATION_INPUT_TITLE}} used in the search |
| `name` | string | Business name |
| `rating` | string or null | Google Maps rating |
| `category` | string or null | Business category |
| `address` | string or null | Business address |
| `website` | string or null | Business website URL |
| `phone` | string or null | Business phone number |
| `email` | string or null | First extracted email address |
| `emails` | array | All extracted email addresses |
| `hasEmail` | boolean | Whether at least one email was found |
| `leadScore` | integer | Contact completeness score from 0 to 100 |
| `leadQuality` | string | `high`, `medium` or `low` based on lead score |
| `googleMapsUrl` | string | Google Maps business URL |
| `error` | string | Error details when a lead or search item cannot be processed |

## Notes

Email extraction depends on whether the business website publicly displays an email address.

Some businesses may not have a website or may block automated browser access.

Runtime and cost depend on result limits, website loading speed, and whether email extraction is enabled.

## Recommended use cases

- Lead generation
- Local business research
- Sales prospecting
- Market research
- Building contact lists
- Finding businesses with websites and public contact emails

## Example search

```json
{
{{#MULTI_SEARCH}}
  "{{SEARCH_LOCATION_INPUT_FIELD}}": "{{DEFAULT_LOCATION}}",
  "{{SEARCH_TYPE_INPUT_FIELD}}": {{DEFAULT_SEARCH_TYPES_JSON}},
  "{{MAX_RESULTS_INPUT_FIELD}}": 20
{{/MULTI_SEARCH}}
{{^MULTI_SEARCH}}
  "keyword": "{{DEFAULT_KEYWORD}}",
  "location": "{{DEFAULT_LOCATION}}",
  "maxResults": 20
{{/MULTI_SEARCH}}
}
```
