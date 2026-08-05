# Phase 4 report — US licensing and official availability

Checked 2026-08-05.

## Acceptance result

| Criterion | Result | Evidence |
| --- | --- | --- |
| At least one US source works for the default title | Pass | Live `apify run --purge` found the VIZ One Piece catalog and product routes |
| Source failure does not remove canonical metadata | Pass | Runner failure fixture still pushes the resolved `One Piece` work |
| License fields include provenance | Pass | VIZ signal includes `license.sourceUrl`, `confidence: official`, and publisher source entries |
| Absence is never labeled `unlicensed` | Pass | Failure/empty fixtures emit `unknown`; no `unlicensed` enum exists |

## Implemented

- HTTP-only VIZ publisher/catalog adapter.
- Strict allowlist for public `/manga-books/manga/...` and product routes.
- No preview, chapter, page, image, `/products`, search, authentication, or proxy requests.
- Product parsing for title, volume, ISBN-10/ISBN-13, format, imprint, and release date.
- Official VIZ/Shonen Jump/VIZ Manga link signals without following reading content.
- Partial enrichment failures that preserve canonical metadata.

## Live default evidence

- One `titleMarketSnapshot` produced in 2 seconds in the final local run.
- VIZ license signal: `licenseSignalFound`, publisher `VIZ Media`.
- Three standard US paperback editions parsed, including ISBN `9781569319017` and release date `2003-09-02`.
- Metadata fallback returned an empty observation for Open Library but did not block the run.

Phase 4 acceptance passes. Proceed to Phase 5.
