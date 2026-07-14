# Benchmark Results

The inputs below are proposed repeatable local benchmarks. Canonical smoke rows recorded at the end of this file are local-only; cloud cost and production coverage are not available locally.

## vietnam-dental-clinic-lead-scraper

- Actor name: `vietnam-dental-clinic-lead-scraper`
- Input JSON:

  `smoke`

  ```json
  {"keyword":"dental clinic","location":"Ho Chi Minh","maxResults":1,"batchSize":1,"extractEmails":false,"useApifyProxy":false}
  ```

  `email-baseline`

  ```json
  {"keyword":"dental clinic","location":"Ho Chi Minh","maxResults":10,"batchSize":5,"extractEmails":true,"useApifyProxy":false}
  ```

  `broader-search`

  ```json
  {"keyword":"dental clinic","location":"Ho Chi Minh","maxResults":20,"batchSize":5,"extractEmails":false,"useApifyProxy":false}
  ```

- Expected result type: Dataset rows containing deduplicated dental-clinic leads.
- What to check manually: Search keyword/location, name, phone, website, Google Maps URL, deduplication, and email extraction when enabled.
- Runtime: Prior full-input run completed successfully; exact duration was not recorded.
- Result count: 20 rows from the prior full input (`maxResults: 20`).
- Email rate: 13/20 (65%).
- Notes: Prior run had website timeout/DNS warnings during email extraction; no Actor errors.

## vietnam-english-center-lead-scraper

- Actor name: `vietnam-english-center-lead-scraper`
- Input JSON:

  `smoke`

  ```json
  {"keyword":"English center","location":"Ho Chi Minh","maxResults":1,"batchSize":1,"extractEmails":false,"useApifyProxy":false}
  ```

  `email-baseline`

  ```json
  {"keyword":"English center","location":"Ho Chi Minh","maxResults":10,"batchSize":5,"extractEmails":true,"useApifyProxy":false}
  ```

  `broader-search`

  ```json
  {"keyword":"English center","location":"Ho Chi Minh","maxResults":20,"batchSize":5,"extractEmails":false,"useApifyProxy":false}
  ```

- Expected result type: Dataset rows containing deduplicated English-center leads.
- What to check manually: Keyword/location, lead fields, valid Google Maps URLs, deduplication, and no email fields when extraction is disabled.
- Runtime: Prior full-input run completed successfully; exact duration was not recorded.
- Result count: 20 rows from the prior full input.
- Email rate: 11/20 (55%).
- Notes: Prior run completed without Actor errors.

## vietnam-gym-lead-scraper

- Actor name: `vietnam-gym-lead-scraper`
- Input JSON:

  `smoke`

  ```json
  {"keyword":"gym","location":"Ho Chi Minh","maxResults":1,"batchSize":1,"extractEmails":false,"useApifyProxy":false}
  ```

  `email-baseline`

  ```json
  {"keyword":"gym","location":"Ho Chi Minh","maxResults":10,"batchSize":5,"extractEmails":true,"useApifyProxy":false}
  ```

  `broader-search`

  ```json
  {"keyword":"gym","location":"Ho Chi Minh","maxResults":20,"batchSize":5,"extractEmails":false,"useApifyProxy":false}
  ```

- Expected result type: Dataset rows containing deduplicated gym and fitness-center leads.
- What to check manually: Search inputs, phone and website normalization, lead score/quality, deduplication, and extraction toggle behavior.
- Runtime: Prior full-input run completed successfully; exact duration was not recorded.
- Result count: 20 rows from the prior full input.
- Email rate: 8/20 (40%).
- Notes: Prior run completed without Actor errors.

## vietnam-hotel-lead-scraper

- Actor name: `vietnam-hotel-lead-scraper`
- Input JSON:

  `smoke`

  ```json
  {"city":"Da Nang","hotelTypes":["hotel","resort","homestay"],"maxResultsPerType":1,"batchSize":1,"extractEmails":false,"useProxy":false}
  ```

  `email-baseline`

  ```json
  {"city":"Da Nang","hotelTypes":["hotel","resort","homestay"],"maxResultsPerType":5,"batchSize":5,"extractEmails":true,"useProxy":false}
  ```

  `broader-search`

  ```json
  {"city":"Da Nang","hotelTypes":["hotel","resort","homestay"],"maxResultsPerType":10,"batchSize":5,"extractEmails":false,"useProxy":false}
  ```

- Expected result type: Dataset rows containing deduplicated hotel, resort, and homestay leads, with the search type represented.
- What to check manually: City/type mapping, per-type limits, deduplication across types, hotel fields, and email extraction toggle behavior.
- Runtime: Prior full-input run completed successfully and was the longest run; exact duration was not recorded.
- Result count: 57 rows from the prior full input (`maxResultsPerType: 20` across three types).
- Email rate: 34/57 (59.6%).
- Notes: Prior run had website navigation/content warnings; no Actor errors.

## vietnam-real-estate-agency-lead-scraper

- Actor name: `vietnam-real-estate-agency-lead-scraper`
- Input JSON:

  `smoke`

  ```json
  {"keyword":"real estate agency","location":"Ho Chi Minh","maxResults":1,"batchSize":1,"extractEmails":false,"useApifyProxy":false}
  ```

  `email-baseline`

  ```json
  {"keyword":"real estate agency","location":"Ho Chi Minh","maxResults":10,"batchSize":5,"extractEmails":true,"useApifyProxy":false}
  ```

  `broader-search`

  ```json
  {"keyword":"real estate agency","location":"Ho Chi Minh","maxResults":20,"batchSize":5,"extractEmails":false,"useApifyProxy":false}
  ```

- Expected result type: Dataset rows containing deduplicated real-estate agency leads.
- What to check manually: Search fields, contact-field extraction, lead scoring, deduplication, and email extraction behavior.
- Runtime: Prior full-input run completed successfully; exact duration was not recorded.
- Result count: 20 rows from the prior full input.
- Email rate: 11/20 (55%).
- Notes: Prior run had one website timeout warning; no Actor errors.

## vietnam-restaurant-lead-scraper

- Actor name: `vietnam-restaurant-lead-scraper`
- Input JSON:

  `smoke`

  ```json
  {"keyword":"restaurant","location":"Ho Chi Minh","maxResults":1,"batchSize":1,"extractEmails":false,"useApifyProxy":false}
  ```

  `email-baseline`

  ```json
  {"keyword":"restaurant","location":"Ho Chi Minh","maxResults":10,"batchSize":5,"extractEmails":true,"useApifyProxy":false}
  ```

  `broader-search`

  ```json
  {"keyword":"restaurant","location":"Ho Chi Minh","maxResults":20,"batchSize":5,"extractEmails":false,"useApifyProxy":false}
  ```

- Expected result type: Dataset rows containing deduplicated restaurant and cafe leads.
- What to check manually: Business name/category, phone, website, Maps URL, deduplication, and email extraction toggle behavior.
- Runtime: Prior full-input run completed successfully; exact duration was not recorded.
- Result count: 20 rows from the prior full input.
- Email rate: 10/20 (50%).
- Notes: Prior run had several website timeout warnings; no Actor errors.

## vietnam-spa-lead-scraper

- Actor name: `vietnam-spa-lead-scraper`
- Input JSON:

  `smoke`

  ```json
  {"keyword":"spa","location":"Ho Chi Minh","maxResults":1,"batchSize":1,"extractEmails":false,"useApifyProxy":false}
  ```

  `email-baseline`

  ```json
  {"keyword":"spa","location":"Ho Chi Minh","maxResults":10,"batchSize":5,"extractEmails":true,"useApifyProxy":false}
  ```

  `broader-search`

  ```json
  {"keyword":"spa","location":"Ho Chi Minh","maxResults":20,"batchSize":5,"extractEmails":false,"useApifyProxy":false}
  ```

- Expected result type: Dataset rows containing deduplicated spa and beauty-clinic leads.
- What to check manually: Search fields, category, contact details, lead score/quality, deduplication, and email extraction toggle behavior.
- Runtime: Prior full-input run completed successfully; exact duration was not recorded.
- Result count: 20 rows from the prior full input.
- Email rate: 8/20 (40%).
- Notes: Prior run had timeout/DNS warnings during website extraction; no Actor errors.

## vietnam-travel-agency-lead-scraper

- Actor name: `vietnam-travel-agency-lead-scraper`
- Input JSON:

  `smoke`

  ```json
  {"keyword":"travel agency","location":"Ho Chi Minh","maxResults":1,"batchSize":1,"extractEmails":false,"useApifyProxy":false}
  ```

  `email-baseline`

  ```json
  {"keyword":"travel agency","location":"Ho Chi Minh","maxResults":10,"batchSize":5,"extractEmails":true,"useApifyProxy":false}
  ```

  `broader-search`

  ```json
  {"keyword":"travel agency","location":"Ho Chi Minh","maxResults":20,"batchSize":5,"extractEmails":false,"useApifyProxy":false}
  ```

- Expected result type: Dataset rows containing deduplicated travel-agency and tour-operator leads.
- What to check manually: Search keyword/location, contact fields, Maps URLs, deduplication, and email extraction toggle behavior.
- Runtime: Prior full-input run completed successfully; exact duration was not recorded.
- Result count: 20 rows from the prior full input.
- Email rate: 13/20 (65%).
- Notes: Prior run had one website timeout warning; no Actor errors.

## vietnam-wedding-venue-lead-scraper

- Actor name: `vietnam-wedding-venue-lead-scraper`
- Input JSON:

  `smoke`

  ```json
  {"keyword":"wedding venue","location":"Ho Chi Minh","maxResults":1,"batchSize":1,"extractEmails":false,"useApifyProxy":false}
  ```

  `email-baseline`

  ```json
  {"keyword":"wedding venue","location":"Ho Chi Minh","maxResults":10,"batchSize":5,"extractEmails":true,"useApifyProxy":false}
  ```

  `broader-search`

  ```json
  {"keyword":"wedding venue","location":"Ho Chi Minh","maxResults":20,"batchSize":5,"extractEmails":false,"useApifyProxy":false}
  ```

- Expected result type: Dataset rows containing deduplicated wedding and event-venue leads.
- What to check manually: Venue name/category, phone, website, Maps URL, deduplication, and email extraction toggle behavior.
- Runtime: Prior full-input run completed successfully; exact duration was not recorded.
- Result count: 20 rows from the prior full input.
- Email rate: 12/20 (60%).
- Notes: Prior run had several website timeout warnings; no Actor errors.
| vietnam-dental-clinic-lead-scraper | 2026-07-14 | smoke | 2577 ms | local-only / not available | completed (0 rows) | 0 | 0 | 0 | Local-only run; cloud testing is separate. |
| vietnam-english-center-lead-scraper | 2026-07-14 | smoke | 2404 ms | local-only / not available | completed (0 rows) | 0 | 0 | 0 | Local-only run; cloud testing is separate. |
| vietnam-gym-lead-scraper | 2026-07-14 | smoke | 2371 ms | local-only / not available | completed (0 rows) | 0 | 0 | 0 | Local-only run; cloud testing is separate. |
| vietnam-hotel-lead-scraper | 2026-07-14 | smoke | 2362 ms | local-only / not available | completed (0 rows) | 0 | 0 | 0 | Local-only run; cloud testing is separate. |
| vietnam-real-estate-agency-lead-scraper | 2026-07-14 | smoke | 2264 ms | local-only / not available | completed (0 rows) | 0 | 0 | 0 | Local-only run; cloud testing is separate. |
| vietnam-restaurant-lead-scraper | 2026-07-14 | smoke | 2275 ms | local-only / not available | completed (0 rows) | 0 | 0 | 0 | Local-only run; cloud testing is separate. |
| vietnam-spa-lead-scraper | 2026-07-14 | smoke | 2214 ms | local-only / not available | completed (0 rows) | 0 | 0 | 0 | Local-only run; cloud testing is separate. |
| vietnam-travel-agency-lead-scraper | 2026-07-14 | smoke | 2326 ms | local-only / not available | completed (0 rows) | 0 | 0 | 0 | Local-only run; cloud testing is separate. |
| vietnam-wedding-venue-lead-scraper | 2026-07-14 | smoke | 2293 ms | local-only / not available | completed (0 rows) | 0 | 0 | 0 | Local-only run; cloud testing is separate. |
| vietnam-coworking-space-lead-scraper | 2026-07-14 | smoke | 2406 ms | local-only / not available | completed (0 rows) | 0 | 0 | 0 | Local-only run; cloud testing is separate. |

## Vietnam Coworking Space Lead Scraper with Emails

| Date | Input | Max results | Runtime | Results | Websites | Emails | Email rate | Cost estimate | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 2026-07-14 | coworking space + Ho Chi Minh City | 5 | ~28 s | 5 | 4 | 3 | 60% | local-only / not available | Smoke test; 5 results returned. |
| 2026-07-14 | coworking space + Ha Noi | 10 | ~28 s | 7 | 6 | 3 | 42.9% | local-only / not available | Benchmark; 7 results returned. |
| 2026-07-14 | shared office + Da Nang | 10 | ~21 s | 5 | 5 | 4 | 80% | local-only / not available | Benchmark; 5 results returned. |
| vietnam-coworking-space-lead-scraper | 2026-07-14 | smoke | 24926 ms | local-only / not available | completed (1 rows) | 1 | 0 | 0 | Local-only run; cloud testing is separate. |
