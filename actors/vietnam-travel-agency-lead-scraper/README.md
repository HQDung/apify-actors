# Vietnam Travel Agency Lead Scraper with Emails

This Actor searches Google Maps for travel agencies and tour operators in Vietnam, extracts business details, and attempts to find email addresses from available websites. It is useful for tourism platforms, hotel partners, B2B sales teams, and travel service providers.

This Actor extracts business information such as name, category, rating, address, phone number, website, email, and Google Maps URL.

## Positioning

- **Target user:** Tourism platforms, hotel partners, B2B sales teams, and travel service providers.
- **Buyer pain point:** Travel businesses need current agency prospects but manual map searches and website checks do not scale across destinations.
- **Differentiation:** Travel-agency and tour-operator-specific Google Maps discovery with optional website email extraction and lead-quality scoring.

## Benchmark inputs

Use these labeled profiles for repeatable local and performance checks. All profiles keep Apify Proxy disabled by default.

Benchmark inputs and results are tracked in the repository [BENCHMARKS.md](../../BENCHMARKS.md).

```json
[
  {
    "label": "smoke",
    "input": {
      "keyword": "travel agency",
      "location": "Ho Chi Minh",
      "maxResults": 1,
      "batchSize": 1,
      "extractEmails": false,
      "useApifyProxy": false
    }
  },
  {
    "label": "email-baseline",
    "input": {
      "keyword": "travel agency",
      "location": "Ho Chi Minh",
      "maxResults": 10,
      "batchSize": 5,
      "extractEmails": true,
      "useApifyProxy": false
    }
  },
  {
    "label": "broader-search",
    "input": {
      "keyword": "travel agency",
      "location": "Ho Chi Minh",
      "maxResults": 20,
      "batchSize": 5,
      "extractEmails": false,
      "useApifyProxy": false
    }
  }
]
```

## Features

- Scrape Google Maps business search results
- Extract business name, category, rating, address, phone number and website
- Extract emails from business websites
- Deduplicate repeated Google Maps results
- Add `hasEmail`, `leadScore` and `leadQuality`


- Support custom keyword and location

- Support parallel processing

## Input

```json
{
  "keyword": "travel agency",
  "location": "Ho Chi Minh",
  "maxResults": 20,
  "batchSize": 5,
  "extractEmails": true,
  "useApifyProxy": false
}
```

## Input fields

| Field | Type | Description |
|---|---|---|


| `keyword` | string | Search keyword for travel agencies and tour operators |
| `location` | string | Target city or area, for example `Ho Chi Minh` or `Ho Chi Minh` |
| `maxResults` | integer | Maximum number of businesses to scrape |

| `batchSize` | integer | Number of business detail pages processed in parallel |
| `extractEmails` | boolean | Whether to extract email addresses from business websites |


| `useApifyProxy` | boolean | Whether to use Apify Proxy for browser requests |


## Output

```json
{
  "keyword": "travel agency",
  "location": "Ho Chi Minh",
  "name": "Example travel agency",
  "rating": "4.5",
  "category": "travel agency",
  "address": "Ho Chi Minh, Vietnam",
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
| `keyword` | string | Keyword used to find the lead |
| `location` | string | Location used in the search |
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


  "keyword": "travel agency",
  "location": "Ho Chi Minh",
  "maxResults": 20

}
```
