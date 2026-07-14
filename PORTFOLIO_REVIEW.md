# Apify Actor Portfolio Review

Review date: 2026-07-14  
Scope: all 10 Actors under `actors/`, including the newly created Coworking Space Actor.

## Review basis

- `Migration status` means structural repository migration: required generated files exist, the repository validator passes, and `apify validate-schema` passes. It does not mean cloud migration or publishing approval.
- `Smoke test status` is based on recorded labeled benchmark evidence. Generated zero-row validation entries are not counted as successful output evidence.
- `Schema quality` includes input usability, output/dataset coverage, and wiring. Coworking wires its dataset schema through `.actor/actor.json`; the older review's portfolio-wide wiring gap should not be applied to it.
- Similarity is assessed at the portfolio/product level, not only by whether each niche has a different keyword.

## Portfolio table

| Actor name | Niche | Target buyer | Main use case | Difference from the base Actor | Input differences | Output differences | README quality score 1-5 | Schema quality score 1-5 | Migration status | Smoke test status | Too similar to another Actor? | Recommendation | Reason |
|---|---|---|---|---|---|---|---:|---:|---|---|---|---|---|
| `vietnam-dental-clinic-lead-scraper` | Dental clinics | Dental suppliers, clinic software companies, B2B sales teams, marketing agencies | Build a qualified clinic prospect list with public phone, website, and email signals. | Same runtime/tests as base; niche-specific metadata and dental keyword. | `keyword`=`dental clinic`, `location`=`Ho Chi Minh`, plus shared `maxResults`, `batchSize`, `extractEmails`, `useApifyProxy`. | Same shared lead fields plus `keyword` and `location`. | 4 | 3 | pass | not run | yes — same single-keyword product shape as the other standard variants | KEEP | Strongest available email yield in the standard group (13/20) and a clear B2B buyer/use case. Keep as a candidate, but benchmark before publishing. |
| `vietnam-english-center-lead-scraper` | English centers and language schools | Education service providers, EdTech companies, B2B sales teams, marketing agencies | Find language-school prospects and public contact emails for education sales or partnerships. | Same runtime/tests as base; niche-specific metadata and education keyword. | `keyword`=`English center`, `location`=`Ho Chi Minh`, plus shared controls. | Same shared lead fields plus `keyword` and `location`. | 4 | 3 | pass | not run | yes — same single-keyword product shape | IMPROVE | Niche positioning is credible, but the Actor has no education-specific output or workflow advantage over a generic local-business scraper. Benchmark keyword coverage and email yield before keeping it standalone. |
| `vietnam-gym-lead-scraper` | Gyms and fitness centers | Fitness equipment suppliers, wellness platforms, B2B sales teams, local marketing agencies | Prospect gyms for equipment, software, wellness, or local marketing outreach. | Same runtime/tests as base; niche-specific metadata and fitness keyword. | `keyword`=`gym`, `location`=`Ho Chi Minh`, plus shared controls. | Same shared lead fields plus `keyword` and `location`. | 4 | 3 | pass | not run | yes — same single-keyword product shape | IMPROVE | Low observed email yield (8/20) and no fitness-specific output. Improve positioning or enrichment value, then benchmark against the standard lead-scraper baseline. |
| `vietnam-hotel-lead-scraper` | Hotels, resorts, homestays, hostels, villas, and apartment hotels | Hotel suppliers, hospitality technology companies, travel platforms, B2B sales teams, tourism service providers | Build accommodation prospect lists across multiple property types in a city. | Only Actor with a real multi-search contract: one city, multiple hotel types, and per-type limits; includes legacy input fallback. | `city`, `hotelTypes[]`, `maxResultsPerType`, `batchSize`, `extractEmails`, `useProxy`; legacy `keyword`/`location` inputs remain accepted by runtime. | Uses `hotelType` and `city` instead of `keyword` and `location`; shared lead/contact fields remain. | 5 | 4 | pass | not run | no — materially differentiated by multi-search and type-aware output | KEEP | Best structural differentiation and broadest accommodation coverage; 34/57 stored results contain email. Keep first in the benchmark queue, but do not publish before the benchmark gate. |
| `vietnam-coworking-space-lead-scraper` | Coworking spaces, shared offices, serviced offices, virtual offices, and flexible-workspace providers | B2B SaaS companies, workspace platforms, office suppliers, HR/recruitment agencies, business-service providers, event/community teams, and partnership/outreach teams | Generate workspace leads for sales prospecting, partnership outreach, market research, database building, and office-related services. | Same Google Maps + optional website-email runtime as the base Actor; niche-specific defaults, metadata, README positioning, and benchmark inputs. | Standard `keyword`, `location`, `maxResults`, `batchSize`, `extractEmails`, and `useApifyProxy`; defaults to `coworking space` and `Ho Chi Minh`. | Same shared lead/contact fields as standard variants; no workspace-specific fields. Dataset schema is wired through `actor.json`. | 4 | 4 | fail — runtime/config structure is consistent, but test fixtures still contain migrated hotel terminology | pass — 5 results in the recorded smoke run | pass — recorded Hanoi and Da Nang runs returned 7 and 5 results, with 42.9% and 80% email rates | no | KEEP | Strong niche positioning and measurable workspace demand make it worth keeping. Clean the hotel residue and expand examples before publication; the standard output contract still creates medium overlap with generic local-business scrapers and Real Estate. |
| `vietnam-real-estate-agency-lead-scraper` | Real estate agencies | B2B sales teams, property technology companies, marketing agencies, real estate service providers | Discover agency prospects and public contact channels for property-related sales. | Same runtime/tests as base; niche-specific metadata and property keyword. | `keyword`=`real estate agency`, `location`=`Ho Chi Minh`, plus shared controls. | Same shared lead fields plus `keyword` and `location`. | 4 | 3 | pass | not run | yes — same single-keyword product shape | IMPROVE | Commercial value is plausible, but the output does not expose property-specific signals and the portfolio has no measured benchmark comparison yet. |
| `vietnam-restaurant-lead-scraper` | Restaurants, cafes, and food businesses | Food suppliers, delivery platforms, POS vendors, B2B sales teams, marketing agencies | Build a broad local food-business prospect list for sales and partnerships. | Same runtime/tests as base; niche-specific metadata and broader restaurant/cafe positioning. | `keyword`=`restaurant`, `location`=`Ho Chi Minh`, plus shared controls. | Same shared lead fields plus `keyword` and `location`. | 4 | 3 | pass | not run | yes — same single-keyword product shape; broadest overlap with generic local-business scraping | IMPROVE | Broad audience and only 10/20 stored results with email make differentiation and economics uncertain. Benchmark before deciding whether to keep standalone or consolidate. |
| `vietnam-spa-lead-scraper` | Spas and beauty clinics | Beauty product suppliers, wellness platforms, B2B sales teams, marketing agencies | Find beauty/wellness business prospects and public contact emails. | Same runtime/tests as base; niche-specific metadata and spa keyword. | `keyword`=`spa`, `location`=`Ho Chi Minh`, plus shared controls. | Same shared lead fields plus `keyword` and `location`. | 3 | 3 | pass | not run | yes — overlaps most with dental and gym while keeping the same generic contract | PAUSE | Weakest README specificity and only 8/20 stored results with email; its buyer/use case overlaps existing wellness and clinic Actors. Pause until a benchmark proves standalone demand. |
| `vietnam-travel-agency-lead-scraper` | Travel agencies and tour operators | Tourism platforms, hotel partners, B2B sales teams, travel service providers | Find agency and tour-operator prospects for hotel, tourism, and travel-service partnerships. | Same runtime/tests as base; niche-specific metadata and travel keyword. | `keyword`=`travel agency`, `location`=`Ho Chi Minh`, plus shared controls. | Same shared lead fields plus `keyword` and `location`. | 4 | 3 | pass | not run | yes — same single-keyword product shape, although buyer overlap is narrower than the implementation overlap | KEEP | Clear tourism buyer and strong stored email yield (13/20). Keep as a candidate, with benchmark required before publication. |
| `vietnam-wedding-venue-lead-scraper` | Wedding and event venues | Wedding service providers, event suppliers, B2B sales teams, local marketing agencies | Build venue prospect lists for event suppliers and wedding-service outreach. | Same runtime/tests as base; niche-specific metadata and event-venue keyword. | `keyword`=`wedding venue`, `location`=`Ho Chi Minh`, plus shared controls. | Same shared lead fields plus `keyword` and `location`. | 4 | 3 | pass | not run | yes — same single-keyword product shape, but the event buyer is distinct | KEEP | Clear event-specific positioning and 12/20 stored results with email. Keep as a candidate; benchmark before publication. |

## Vietnam Coworking Space Lead Scraper with Emails

| Field | Evaluation |
|---|---|
| Actor name | `vietnam-coworking-space-lead-scraper` |
| Niche | Coworking spaces, shared offices, serviced offices, virtual offices, and flexible workspaces in Vietnam. |
| Target buyer | B2B SaaS companies, workspace platforms, office suppliers, HR/recruitment agencies, business-service providers, event/community teams, and partnership/outreach teams. |
| Main use case | Lead generation, partnership outreach, market research, workspace database building, and sales prospecting for office-related services. |
| Difference from base Actor | Same Google Maps discovery and optional website-email extraction, with coworking-specific defaults, metadata, positioning, and benchmark inputs. |
| Difference from similar Actors | Focuses on workspace operators rather than generic local businesses; unlike Real Estate, it targets operating coworking/shared-office providers rather than agencies, brokers, property companies, or real-estate services. |
| Real Estate overlap risk | Medium |
| Input differences | Standard keyword/location contract. Defaults to `coworking space` and `Ho Chi Minh`; examples should also cover `shared office`, `serviced office`, `virtual office`, and `flexible workspace`, with Ho Chi Minh City, Ha Noi, Da Nang, Binh Duong, and Phu Quoc. |
| Output differences | Same standard lead fields; no workspace-specific enrichment fields such as desk type, office plan, or amenities. |
| README quality score | 4/5 — strong positioning and use cases, but duplicated blank lines and a repeated location example reduce polish. |
| Schema quality score | 4/5 — valid and complete, with dataset wiring in `actor.json`; the contract remains generic rather than workspace-specific. |
| Template consistency | Fail — runtime/config and schemas match the template, but `test/lead-utils.test.js` contains leftover hotel fixtures and test names. |
| Smoke test status | Pass — recorded local smoke run returned 5 results; the separate generated zero-row validation entry is not treated as output evidence. |
| Benchmark status | Pass — recorded local benchmark runs returned 5 results for Ho Chi Minh, 7 for Ha Noi, and 5 for Da Nang, with email rates of 60%, 42.9%, and 80%. |
| Duplicate risk | Medium |
| Recommendation | KEEP |
| Reason | Clear workspace-specific buyers and use cases justify a standalone Actor. Clean the hotel residue and examples, then publish only after the normal release gate; do not merge or pause. |

## Portfolio summary

- **Current total number of Actors:** 10.
- **Actors safe to keep:** Hotel, Dental Clinic, Travel Agency, Wedding Venue, and Coworking Space.
- **Actors that need improvement:** English Center, Gym, Real Estate Agency, Restaurant, and Spa; Coworking needs only documentation/template cleanup before publication.
- **Actors that may overlap:** The eight older standard variants share the generic lead contract. Coworking has medium implementation overlap with Local Business/Google Maps scrapers and medium market overlap with Real Estate, but its workspace-provider positioning is distinct.
- **Coworking Space decision:** Improve first (documentation residue and examples), then publish if the recorded local benchmark evidence is accepted; do not merge or pause.

## Top 3 Actors to improve first

1. `vietnam-spa-lead-scraper` — pause/repair the weakest differentiation and validate whether it should merge into a broader wellness/clinic offering.
2. `vietnam-gym-lead-scraper` — improve the value proposition or add fitness-specific enrichment; stored email yield is only 8/20.
3. `vietnam-restaurant-lead-scraper` — clarify the buyer and test whether a broad restaurant scraper earns a standalone Store listing; stored email yield is 10/20.

Portfolio-wide prerequisite: keep `.actor/dataset_schema.json` wired through `.actor/actor.json.storages.dataset` for every Actor before treating schema quality as publish-ready. Coworking already satisfies this wiring check.

## Actors that are too similar

The following eight standard variants are functionally the same product with a different default keyword and niche copy:

- `vietnam-dental-clinic-lead-scraper`
- `vietnam-english-center-lead-scraper`
- `vietnam-gym-lead-scraper`
- `vietnam-real-estate-agency-lead-scraper`
- `vietnam-restaurant-lead-scraper`
- `vietnam-spa-lead-scraper`
- `vietnam-travel-agency-lead-scraper`
- `vietnam-wedding-venue-lead-scraper`

This is not proof that they must be merged: distinct buyers can justify separate listings. It is enough similarity to require benchmarked demand or niche-specific enrichment before maintaining all eight as separate products. Hotel is the exception because its multi-search input and `hotelType` output create a real contract difference.

## Actors safe to publish/keep

Safe to keep in the repository now, subject to the publish gate:

- `vietnam-hotel-lead-scraper`
- `vietnam-dental-clinic-lead-scraper`
- `vietnam-travel-agency-lead-scraper`
- `vietnam-wedding-venue-lead-scraper`
- `vietnam-coworking-space-lead-scraper`

The first four legacy candidates still require their benchmark/schema gates. Coworking has recorded local smoke and benchmark output and has the dataset-schema wiring, but should receive the small documentation/template cleanup above before publication.

## Actors that need benchmark before decision

The following 9 legacy Actors need the labeled `smoke` benchmark before a final keep, merge, pause, or publish decision:

`vietnam-dental-clinic-lead-scraper`, `vietnam-english-center-lead-scraper`, `vietnam-gym-lead-scraper`, `vietnam-hotel-lead-scraper`, `vietnam-real-estate-agency-lead-scraper`, `vietnam-restaurant-lead-scraper`, `vietnam-spa-lead-scraper`, `vietnam-travel-agency-lead-scraper`, and `vietnam-wedding-venue-lead-scraper`.

Prioritize benchmark comparisons for Spa, Gym, Restaurant, English Center, and Real Estate Agency because their standalone value is least proven by the current portfolio evidence.

## Leftover text found

- Coworking README, schemas, sample input, actor metadata, niche config, and runtime source contain no obvious leftover `hotel`, `restaurant`, `spa`, `dental`, `real estate`, `school`, `gym`, or `clinic` terms.
- `actors/vietnam-coworking-space-lead-scraper/test/lead-utils.test.js` still uses hotel fixtures and test descriptions (`hotelConfig`, `canonical hotel fields`, `Hotel`). This is test/source residue, not scraper logic, and was intentionally not changed in this review.

## Recommended next new Actor niche

### Vietnam Accounting Firm Lead Scraper

Target buyers would include accounting software vendors, payroll providers, tax-service platforms, banks, insurers, and B2B financial-service teams. It is distinct from the current consumer/local-business niches while still fitting the existing Google Maps lead workflow. Do not implement it until the current portfolio benchmark, documentation, and schema gates are complete.
