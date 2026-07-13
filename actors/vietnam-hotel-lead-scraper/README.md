# Vietnam Hotel Lead Scraper with Emails

Scrape hotel, resort, homestay, hostel, villa and apartment hotel leads from Google Maps in Vietnam, including emails when available.

This Actor extracts business information such as name, category, rating, address, phone number, website, email, and Google Maps URL.

## Positioning

- **Target user:** Hotel suppliers, hospitality technology companies, travel platforms, B2B sales teams, and tourism service providers.
- **Buyer pain point:** Finding and qualifying accommodation businesses across multiple property types requires repetitive searches and manual website checks.
- **Differentiation:** Accommodation-specific multi-search across hotel types, with optional public website email extraction and lead-quality scoring.

## Benchmark inputs

Use these labeled profiles for repeatable local and performance checks. All profiles keep Apify Proxy disabled by default.

Benchmark inputs and results are tracked in the repository [BENCHMARKS.md](../../BENCHMARKS.md).

```json
[
  {
    "label": "smoke",
    "input": {
      "city": "Da Nang",
      "hotelTypes": [
        "hotel",
        "resort",
        "homestay"
      ],
      "maxResultsPerType": 1,
      "batchSize": 1,
      "extractEmails": false,
      "useProxy": false
    }
  },
  {
    "label": "email-baseline",
    "input": {
      "city": "Da Nang",
      "hotelTypes": [
        "hotel",
        "resort",
        "homestay"
      ],
      "maxResultsPerType": 5,
      "batchSize": 5,
      "extractEmails": true,
      "useProxy": false
    }
  },
  {
    "label": "broader-search",
    "input": {
      "city": "Da Nang",
      "hotelTypes": [
        "hotel",
        "resort",
        "homestay"
      ],
      "maxResultsPerType": 10,
      "batchSize": 5,
      "extractEmails": false,
      "useProxy": false
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

- Search multiple hotel types per city


- Support parallel processing

## Input

```json
{
  "city": "Da Nang",
  "hotelTypes": [
    "hotel",
    "resort",
    "homestay"
  ],
  "maxResultsPerType": 20,
  "batchSize": 5,
  "extractEmails": true,
  "useProxy": false
}
```

## Input fields

| Field | Type | Description |
|---|---|---|

| `city` | string | Vietnam city to search for accommodation leads. |
| `hotelTypes` | string[] | Accommodation types to search in the selected city. |
| `maxResultsPerType` | integer | Maximum number of Google Maps results to collect for each hotel type. |


| `batchSize` | integer | Number of business detail pages processed in parallel |
| `extractEmails` | boolean | Whether to extract email addresses from business websites |

| `useProxy` | boolean | Whether to use Apify Proxy for browser requests |

Legacy `keyword`, `location`, `maxResults` and `useApifyProxy` inputs are still accepted for backward compatibility.



## Output

```json
{
  "hotelType": "hotel",
  "city": "Da Nang",
  "name": "Example hotel",
  "rating": "4.5",
  "category": "hotel",
  "address": "Da Nang, Vietnam",
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
| `hotelType` | string | Hotel type used to find the lead |
| `city` | string | City used in the search |
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

  "city": "Da Nang",
  "hotelTypes": ["hotel","resort","homestay"],
  "maxResultsPerType": 20


}
```
