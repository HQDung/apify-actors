# Vietnam Hotel Lead Scraper with Emails

Scrape hotel, resort, homestay, hostel, villa and apartment hotel leads from Google Maps in Vietnam, including emails when available.

This Actor searches multiple accommodation types in a selected Vietnamese city, extracts business details, deduplicates repeated Google Maps results, and scores each lead by contact completeness.

## Features

- Search multiple accommodation types per city
- Extract business name, category, rating, address, phone, website and Google Maps URL
- Extract emails from public business websites
- Add `hotelType` and `city` to each result
- Add `hasEmail`, `leadScore` and `leadQuality`
- Deduplicate by Google Maps URL, with name and address fallback
- Support parallel detail-page processing

## Input

```json
{
  "city": "Da Nang",
  "hotelTypes": ["hotel", "resort", "homestay"],
  "maxResultsPerType": 20,
  "batchSize": 5,
  "extractEmails": true,
  "useProxy": false
}
```

## Input fields

| Field | Type | Description |
|---|---|---|
| `city` | string | Vietnam city to search, for example `Da Nang`, `Ho Chi Minh`, `Ha Noi` |
| `hotelTypes` | string[] | Accommodation types to search in the selected city |
| `maxResultsPerType` | integer | Maximum Google Maps results to collect for each hotel type |
| `batchSize` | integer | Number of business detail pages processed in parallel |
| `extractEmails` | boolean | Whether to extract email addresses from business websites |
| `useProxy` | boolean | Whether to use Apify Proxy for browser requests |

Legacy `keyword`, `location`, `maxResults` and `useApifyProxy` inputs are still accepted for backward compatibility.

## Output

```json
{
  "hotelType": "resort",
  "city": "Da Nang",
  "name": "Example Resort",
  "rating": "4.5",
  "category": "Resort hotel",
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
| `hotelType` | string | Accommodation type used to find the lead |
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

## Recommended use cases

- Hotel marketing lead generation
- Travel agency outreach
- OTA partnership research
- Hospitality supplier prospecting
- Local SEO agency prospecting

## Notes

Email extraction depends on whether the business website publicly displays an email address.

Some businesses may not have a website or may block automated browser access.

Runtime and cost depend on the number of hotel types, result limits, website loading speed, and whether email extraction is enabled.
