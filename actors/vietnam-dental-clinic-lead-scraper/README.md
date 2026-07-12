# Vietnam Dental Clinic Lead Scraper with Emails

This Actor searches Google Maps for dental clinics in Vietnam, extracts business details, and attempts to find email addresses from available websites. It is useful for dental suppliers, clinic software companies, B2B sales teams, and marketing agencies.

This Actor extracts business information such as name, category, rating, address, phone number, website, email, and Google Maps URL.

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


  "keyword": "dental clinic",
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


| `keyword` | string | Search keyword for dental clinics |
| `location` | string | Target city or area, for example `Ho Chi Minh` or `Ho Chi Minh` |
| `maxResults` | integer | Maximum number of businesses to scrape |

| `batchSize` | integer | Number of business detail pages processed in parallel |
| `extractEmails` | boolean | Whether to extract email addresses from business websites |


| `useApifyProxy` | boolean | Whether to use Apify Proxy for browser requests |


## Output

```json
{
  "keyword": "dental clinic",
  "location": "Ho Chi Minh",
  "name": "Example dental clinic",
  "rating": "4.5",
  "category": "dental clinic",
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


  "keyword": "dental clinic",
  "location": "Ho Chi Minh",
  "maxResults": 20

}
```
