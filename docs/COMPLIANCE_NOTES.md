# Manga Source Compliance Notes

Phase 0 compliance review captured 2026-08-05. This document is a technical intake, not legal advice. Production implementation remains blocked until the source permission questions below are resolved.

## Non-negotiable collection boundaries

The Actor may collect public metadata and availability signals only. It must not:

- download, store, OCR, transform, or redistribute manga pages or chapter images;
- follow cover/image URLs when a text or structured field is sufficient;
- access private, authenticated, paywalled, or access-controlled content;
- bypass robots restrictions, CAPTCHAs, region controls, or rate limits;
- infer a license from retailer presence alone;
- label a title `unlicensed` merely because no public license signal was found;
- merge editions across country, language, format, publisher, ISBN, or edition type without evidence.

The phase fixture confirms that the spike itself followed these boundaries: no authentication, no proxy, no linked-image requests, no raw HTML storage, and no chapter data.

## Provider-specific findings

### Kitsu

The public JSON:API endpoint was technically reliable for the 29-query matrix, but the current API-specific commercial/data-reuse terms were not located in the available documentation. The API appears to expose community-maintained media metadata and can produce false positives for localized queries. Obtain written permission or a current commercial-use statement before using it in an Apify Store Actor. Until then, keep Kitsu out of production code and use the fixture only as spike evidence.

### Open Library

Open Library’s official API guidance asks clients to identify themselves, cache responses, use low-volume human-facing requests, and avoid using the API as a backend for high-traffic commercial infrastructure. The proposed Actor is not authorized to treat Open Library as an unrestricted bulk database. Any future adapter must:

- send a stable descriptive User-Agent and contact address;
- use `search.json` batch results rather than one request per edition;
- cache by normalized query and ISBN;
- apply a conservative request budget and backoff;
- obtain confirmation that the intended Apify use fits the provider’s current policy.

### Wikidata/Wikimedia

Wikidata structured data is CC0, and the public API is appropriate for sparse identity/disambiguation requests when the Wikimedia User-Agent and rate policies are followed. The probe nevertheless observed HTTP 429 after a short burst. The Actor must not distribute requests across IPs or retry aggressively. Use a small cached disambiguation budget or a pre-approved batch/dump approach; do not make Wikidata a per-title hot path.

### AniList

AniList’s official terms say commercial use above its stated revenue threshold requires a commercial license and restrict competing non-complementary manga-list/tracker services. The product’s market-intelligence positioning creates a material terms risk. Do not use AniList in production without written authorization, even though its GraphQL response is technically strong.

### Google Books and Jikan

Google Books was not available for the no-secret default in the probe because the unauthenticated quota returned HTTP 429 with a zero daily limit. A future API-key path would need its own secret, quota, and terms review. Jikan did not complete during bounded probes; no compliance or field support claim is made for it.

## Official publishers and readers

### VIZ

VIZ is the proposed US publisher/catalog source. Restrict requests to explicitly allowlisted manga-book and product routes. The current robots file disallows paths including `/search` and `/products`; do not assume that a different route is permitted merely because it returns HTTP 200. Use direct product metadata and link/access signals only. Do not fetch free previews, pages, chapters, or images.

### Kim Đồng

Kim Đồng is the proposed Vietnamese publisher source. The public category and product routes expose Vietnamese volume, price, stock, product-code, author, and sometimes ISBN fields. Respect its robots disallows for admin, cart, search, checkout, account, and other private routes. A product page is evidence of a publisher/catalog listing, not by itself a complete legal-rights history; license status must remain source-qualified.

### MANGA Plus by SHUEISHA

MANGA Plus is an official reading service according to its official FAQ, but the sampled robots file disallows all crawling and the title route is a JavaScript-only shell. No crawler adapter is approved. A future record may retain a MANGA Plus URL only when it is discovered from an allowed source or supplied directly by the user; it must not fetch chapter content.

## Retailers

Barnes & Noble and Fahasa expose public product/structured metadata suitable for optional offer adapters. Both require conservative handling:

- restrict to product pages, not account/cart/checkout endpoints;
- parse only title, ISBN, format, price, currency, availability, and product URL;
- deduplicate variants by ISBN and normalized URL;
- preserve `preorder`, `outOfStock`, and location-dependent stock separately;
- never use retailer presence as definitive license evidence;
- stop on robots, rate-limit, authentication, or CAPTCHA signals.

## Data handling and output claims

- Store provenance for every license, publisher, edition, availability, price, and stock field.
- Preserve the source label alongside normalized `volumeNumber`, `editionType`, `format`, and `stockStatus`.
- Use `unknown` when a source cannot establish a value and `notFound` when a bounded search found no public signal.
- State retrieval time for volatile price/stock data.
- Avoid retaining personal data, reviewer data, cart state, cookies, or authentication tokens.
- Do not describe source coverage as global until each market/source pair has passed a separate spike.

## Release gate

Phase 1 is approved only after all of the following are documented:

1. Kitsu commercial/data-reuse permission, or a replacement metadata provider with clear terms.
2. Open Library usage approval for the intended low-volume commercial workflow, or a replacement edition provider.
3. Confirmed allowlists for VIZ and Kim Đồng routes, including their current robots/policy state.
4. A verified no-secret `One Piece` US/en path using only permitted sources.
5. A matcher design that keeps ambiguous Vietnamese aliases out of automatic selection.
6. Test fixtures proving that standard, omnibus, deluxe, digital, and localized editions remain separate.

Until then, the correct status is `blocked_pending_source_permission`; no production crawler, retailer adapter, publisher, change-detection code, benchmark, or publication action should begin.
