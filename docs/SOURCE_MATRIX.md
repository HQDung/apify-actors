# Manga Source Matrix

Phase 0 source evaluation captured 2026-08-05. “Selected” means technically suitable for an allowlisted adapter after the production permission gate is cleared; it does not mean the Actor is published or authorized to crawl every route on the host.

## Metadata and work identity

| Source | Access and search | JS / pagination | Stable identity and fields | Region / edition behavior | Decision |
| --- | --- | --- | --- | --- | --- |
| Kitsu API (`kitsu.io/api/edge/manga`) | Public GET; requires `Accept: application/vnd.api+json`; 29/29 sampled queries returned 200 | No browser; JSON:API pagination links/offsets observed | Numeric manga ID, canonical title, multilingual titles, status, dates, volume/chapter counts, serialization; no ISBN/price/stock | Not market-specific; localized title maps are uneven; false positives observed for two Vietnamese aliases | Primary work source, permission-gated |
| Open Library Search API | Public GET; identified User-Agent required for higher documented request rate; 29/29 sampled queries returned 200 | No browser; `page`/`limit` pagination | Work keys, edition keys, ISBNs, languages, publishers, first-publish year | Edition-rich but title-only search is noisy and Vietnamese aliases were weak; do not merge by title | Edition fallback, low-volume/usage approval-gated |
| Wikidata Action API | Public GET; stable Q-IDs and descriptions | No browser; search endpoint rate-limited in probe | Entity ID, label, description, alias match; CC0 structured data | Good manga/anime/game disambiguation; HTTP 429 from request 11 in the probe | Sparse disambiguation only |
| AniList GraphQL | Public POST; no secret; one sampled query returned 200 with 30/29 rate headers | No browser; GraphQL query is compact | Strong title/alias/status/date/volume fields | Good work identity but provider terms restrict competing services and commercial use | Reject until written permission |
| Google Books Volumes API | Public GET endpoint, but sampled calls returned HTTP 429 with zero unauthenticated daily quota | No browser; documented `startIndex` pagination | Volume IDs, ISBNs, publishers, dates, prices where available | Edition-oriented, not a safe no-secret default in this environment | Reject for default; reconsider with explicit quota/key |
| Jikan API | Public endpoint was attempted twice; both bounded probes failed to complete | Unknown in this environment | Not validated | Not validated | Reject for default |

## Official publisher and reading sources

| Source | Tested route | HTTP / rendering | Fields observed | Robots / policy result | Decision |
| --- | --- | --- | --- | --- | --- |
| VIZ publisher/catalog | `https://www.viz.com/manga-books/manga/one-piece/all` and direct `/product/{id}` routes | Series 200, server-rendered; standard, omnibus, and box-set product pages 200 | Volume labels, stable product URLs/IDs, ISBN-13, format, price, release-date evidence; direct product page title | `https://www.viz.com/robots.txt` disallows `/search` and `/products` among other paths; use only allowlisted manga-book routes | Select US publisher adapter |
| VIZ official reading signals | VIZ product and Shonen Jump/VIZ Manga links discovered from allowed catalog routes | Link/availability signals are accessible; no chapter collection | Official reading link/access label can be recorded; no page content | Do not follow preview/chapter/image assets | Select as link-signal adapter only |
| MANGA Plus by SHUEISHA | `https://mangaplus.shueisha.co.jp/titles/100020` | HTTP 200 but JavaScript-only shell | Title metadata is not server-rendered in the sampled response | `https://mangaplus.shueisha.co.jp/robots.txt` disallows all crawling | Do not crawl; external-link-only until permission |
| Kim Đồng | `https://nxbkimdong.com.vn/one-piece` and product routes | Category/product 200; Vietnamese text server-rendered | `Tập` labels, product code, VND price, stock, author, format; ISBN on some products | Robots disallows private/admin/cart/account/search routes; public category/product routes are the only proposed allowlist | Select Vietnam publisher adapter |

## Retailers

| Source | Tested route | HTTP / rendering | Fields observed | Region and policy result | Decision |
| --- | --- | --- | --- | --- | --- |
| Barnes & Noble | `https://www.barnesandnoble.com/w/one-piece-vol-1-eiichiro-oda/1129763095` | HTTP 200; Schema.org JSON-LD plus rendered HTML | Product group ID, paperback/ebook ISBNs, USD price, format, availability | US retailer; robots disallows private commerce paths but not the tested `/w/` product route | Select US retailer adapter with variant matching |
| Fahasa | `https://www.fahasa.com/one-piece-tap-1-romance-dawn-binh-minh-cua-cuoc-phieu-luu-tai-ban-2025.html` | HTTP 200; Schema.org JSON-LD and rendered HTML | Vietnamese title, publisher, VND price, JSON-LD `InStock`, product URL | Vietnam retailer; public product page and terms page available; stock may vary by delivery location | Select Vietnam retailer adapter |

## Operational conclusions

- Prefer HTTP/JSON or server-rendered metadata routes. Browser automation is not required for the selected Phase 1 path.
- Keep publisher/catalog, official-reading, and retailer adapters separate. A retailer listing is evidence of availability, not proof of a license.
- Use ISBN as the first edition join key. Otherwise require matching language, country, volume, format, publisher, and edition type.
- Preserve source titles and Vietnamese labels; normalize them only into parallel fields.
- Treat `notFound` and `unknown` as source-search outcomes, never as `unlicensed`.
- Enforce per-source allowlists, request deadlines, caching, rate limits, retries, and no-follow rules for image/chapter assets.
