# Manga Source Feasibility Spike

Captured 2026-08-05 for Phase 0 of the Manga Release, Licensing & Availability Intelligence handoff.

## Result

The default `One Piece` / `US-en` path can produce a metadata-backed result without authentication, an Apify Proxy, chapter requests, or image downloads:

```text
Kitsu work lookup
  → stable work id 38 / canonical title One Piece
  → VIZ US catalog series page
  → optional VIZ product/reading signal
```

The technical path is viable. The production gate remains blocked pending written permission or confirmed commercial usage terms for the metadata providers. Phase 1 must not start until that gate is resolved.

Evidence is stored in [manga-source-spike.json](/Users/dunghuynh/Desktop/apify-actors/.worktrees/manga-source-feasibility/tests/fixtures/source-responses/manga-source-spike.json), and the dependency-free regression test is [manga-source-spike.test.mjs](/Users/dunghuynh/Desktop/apify-actors/.worktrees/manga-source-feasibility/test/manga-source-spike.test.mjs).

## Method

- Queried 29 representative titles covering popular ongoing, completed, hiatus, multi-part, localized-edition, and Vietnamese-alias cases.
- Tested English, punctuation/spacing variants, Japanese romanizations, and Vietnamese labels such as `Đảo Hải Tặc`, `Bảy Viên Ngọc Rồng`, `Đôrêmon`, and `Thám Tử Lừng Danh Conan`.
- Used public GET/POST endpoints with a descriptive User-Agent and bounded timeouts.
- Retained only response metadata, stable IDs, field-presence evidence, hashes, and selected normalized observations. No raw HTML, cover bytes, manga pages, chapters, or linked image URLs were stored.
- Probed pagination, search behavior, status/region signals, robots files, and available terms/policy pages.

## Metadata findings

### Kitsu

Kitsu returned HTTP 200 for all 29 title queries when the required `application/vnd.api+json` Accept header was used. It provided stable manga resource IDs, canonical titles, multilingual title maps, publication status, dates, and volume/chapter counts where present. `One Piece` resolved to work ID `38`; the Vietnamese alias `Đảo Hải Tặc` also resolved to `38`.

The matcher still needs conservative scoring. `Thám Tử Lừng Danh Conan` ranked a Kindaichi record first, and `Bảy Viên Ngọc Rồng` ranked an unrelated title first. Results must be filtered by title maps, language, author/serialization evidence, and a minimum confidence threshold; low-confidence results must remain `ambiguous`.

Kitsu does not provide ISBN, retailer price, or stock fields in the sampled work response. It is therefore a work-identity source, not an edition or offer source.

### Open Library

Open Library returned HTTP 200 for all 29 queries and supplied stable work keys, edition keys, ISBNs, language hints, publishers, and first-publish years. It is useful for edition evidence and cross-checking ISBNs.

Title-only search is not a canonical-work resolver by itself. It often ranks volume-level records, unrelated books, or non-manga results; Vietnamese aliases were especially noisy. The adapter must filter by author/title/subject and never merge records solely by a normalized title. Requests must be low-volume, cached, and identified as required by the provider guidance.

### Wikidata

Wikidata search supplied stable Q-IDs and descriptions that can distinguish manga from anime, media franchises, and games. It also resolved several Vietnamese aliases to franchise records. However, the public search endpoint returned HTTP 429 beginning with the 11th request in this probe, despite a compliant User-Agent. It is suitable only as a sparse disambiguation fallback or through a future batch/dump strategy, not as a per-title Phase 1 dependency.

### Rejected or conditional metadata candidates

- AniList returned a strong no-auth GraphQL result and a current observed rate-limit header of 30 requests/minute, but its terms restrict competing manga-list/tracker services and require commercial licensing above a revenue threshold. Do not use it without written permission.
- Google Books returned HTTP 429 with a zero unauthenticated daily quota in this environment. It is not suitable for the no-secret default; revisit only with an explicitly configured quota/key contract.
- Jikan did not complete during two bounded probes and is not a dependable default dependency.

## Market and availability findings

### United States

VIZ is the strongest initial US source. Its One Piece series route returned HTTP 200 with server-rendered title and volume links, 113 volume labels, and stable product URLs. Direct product routes exposed ISBN-13, price, format/edition distinctions, and release-date evidence for an omnibus sample. Box-set products use separate numeric product IDs and ISBNs, so they can remain separate editions.

Use allowlisted `/manga-books/...` routes only. Do not crawl VIZ paths disallowed by its robots file, and do not follow preview/chapter/image assets. For official-reading availability, record the existence of VIZ/Shonen Jump/VIZ Manga links and access labels; do not download or reproduce manga content.

Barnes & Noble is a viable US retailer adapter. Its public product page exposed Schema.org product variants for the paperback ISBN `9781569319017` and ebook ISBN `9781421545257`, with USD prices and availability. Variant selection is mandatory because one page can contain mixed format and stock text.

### Vietnam

Kim Đồng is a viable official Vietnamese publisher/catalog source. Its One Piece collection and product routes returned HTTP 200 and exposed Vietnamese volume labels such as `Tập 110`, product codes, VND prices, and stock labels such as `Còn hàng`. It also exposes product ISBNs on some product pages, but ISBN/release-date coverage is not uniform; missing fields must remain null.

Fahasa is a viable Vietnamese retailer adapter. The One Piece product returned HTTP 200 and Schema.org product data with the Vietnamese title, Kim Đồng as publisher, price `28500`, currency `VND`, and `InStock`. Stock is location-sensitive and retailer presence is not proof of licensing rights.

MANGA Plus is an official reading service, but its public robots file disallows crawling and its title page is JavaScript-only. It is not selected for Phase 1 without explicit permission. It can be listed as an external official-reading link only when discovered through an allowed source, without fetching chapters or images.

## Recommended Phase 1 adapter boundary

Subject to the production gate:

1. `KitsuWorkMetadataAdapter` — work identity and aliases; permission-gated.
2. `OpenLibraryEditionAdapter` — ISBN/edition cross-check; low-volume and usage-approval-gated.
3. `VizMangaCatalogAdapter` — US publisher/catalog and official link signals, allowlisted routes only.
4. `KimDongPublisherAdapter` — Vietnamese publisher/category/product data, preserving original Vietnamese text.
5. `BarnesNobleOfferAdapter` — US retailer product JSON-LD, variant-aware.
6. `FahasaOfferAdapter` — Vietnam retailer product JSON-LD, location-aware stock.

Keep Wikidata as an optional sparse disambiguation adapter, not a default per-title lookup. Do not add AniList, Google Books, Jikan, or MANGA Plus to the default path during Phase 1.

## Phase 0 acceptance review

| Requirement | Result |
| --- | --- |
| Default metadata path works | Yes, Kitsu `One Piece` work ID `38` |
| No secret required | Yes in the probe |
| No proxy required | Yes in the probe |
| Fallback metadata path exists | Yes technically; Open Library/Wikidata remain permission/rate gated |
| Initial market sources documented | Yes |
| No chapter/image scraping planned | Yes; enforced in fixture policy |
| Unsupported claims documented | Yes |
| Production implementation may start | No; source permission gate remains open |
