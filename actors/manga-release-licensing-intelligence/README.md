# Manga Release, Licensing & Availability Intelligence

Track public manga metadata, market licensing signals, localized editions, official availability, releases, prices, stock, release gaps, and run-to-run changes across US/English and Vietnam/Vietnamese.

## What this Actor does

The runnable `titleLookup` mode resolves a manga work, enriches supported markets, and emits one normalized `titleMarketSnapshot` per resolved title-market pair. It uses public metadata, publisher/catalog pages, and optional configured retailer pages. It does not download manga chapters or pages.

The Actor writes snapshots incrementally and always writes `RUN_SUMMARY` and `CHANGE_REPORT` when the Actor reaches its reporting path. It does not publish automatically or change pricing automatically.

## Who it is for

- Manga retailers and price-comparison services.
- Publishers and licensing teams.
- Libraries, catalog applications, and discovery products.
- Collectors and market researchers.

## Supported markets

- `US-en` — United States, English.
- `VN-vi` — Vietnam, Vietnamese.

## Supported sources

| Market | Metadata | Licensing/availability | Optional offers |
| --- | --- | --- | --- |
| US/en | Kitsu; Open Library fallback | VIZ public catalog/product pages | Barnes & Noble public product pages |
| VN/vi | Kitsu with vetted Vietnamese aliases; Open Library fallback | Kim Đồng public catalog/product pages | Fahasa public product pages |

Source access remains permission-gated by the Phase 0 compliance notes. Source failure or absence is reported with provenance and does not become an `unlicensed` claim.

## Title lookup

Use the default input for a one-title, one-market run. Add titles and supported markets to retrieve multiple snapshots. Matching is conservative: low-confidence or ambiguous candidates are not auto-selected, and a metadata failure never creates a fabricated record.

## Publisher calendar

`publisherCalendar` is present in the input schema for forward compatibility but is not runnable in this version. Publisher pages are currently used as market enrichment for `titleLookup`.

## Availability monitoring

`availabilityMonitor` is reserved for a later phase. The current `titleLookup` mode can collect optional public offers when `includeRetailOffers` is enabled and `editionUrls` contains allowlisted product URLs.

## Input examples

- [`samples/input.default.json`](samples/input.default.json) — Store-style default; no proxy, secret, or retailer crawl.
- [`samples/input.us-vn.json`](samples/input.us-vn.json) — one Vietnamese alias across both markets.
- [`samples/input.retail.json`](samples/input.retail.json) — opt-in Barnes & Noble/Fahasa offer collection.

Change detection additionally requires `detectChanges: true` and a `previousDatasetId`.

## Output example

See [`samples/output.default.json`](samples/output.default.json) for a representative matched snapshot. Each snapshot has a stable `actorOutputSchemaVersion`, `recordType`, work identity, market, nested evidence, warnings, sources, and flattened fields for table/CSV use.

The Actor also writes:

- `RUN_SUMMARY` — counts, duration, warnings, and source failures.
- `CHANGE_REPORT` — detected changes or an explicit disabled-by-default empty report.

## Licensing statuses

- `licenseSignalFound` — a tested public publisher/catalog signal was found.
- `licensed` — reserved for a future source that provides an explicit licensed status.
- `unknown` — the tested sources did not provide enough evidence.

The Actor does not emit `unlicensed`. A missing result is not proof that a work is unlicensed, and a retailer listing alone is not licensing proof.

## Edition matching

Edition IDs incorporate work, market, language, ISBN, title, publisher, edition type, format, and volume evidence. ISBN-identical listings merge when compatible. Paperback, ebook, hardcover, standard, omnibus, deluxe, box-set, and special editions remain distinguishable. Missing identity evidence is treated conservatively.

## Release-gap calculation

Enable `includeReleaseGap` to compare the latest original standard volume with the latest localized standard volume when both are comparable. Ongoing works without a reliable original latest-volume signal return `calculated: false` and `volumeGap: null`. Omnibus, deluxe, box-set, special, art-book, spin-off, guide, and novel labels are excluded. Calculated gaps include provenance for both sides.

## Change detection

Enable `detectChanges` with a previous dataset ID. Snapshots match by `workId + marketCode`; editions match by `editionId`; offers match by provider/offer identity and edition. Supported changes include new license signals, publisher changes, new volumes, official reading links, new offers, price changes, stock changes, preorder openings, and release-date changes. Timestamps, source request order, and warning order are ignored.

## Price and stock handling

Prices remain numeric with their source currency (`USD` or `VND` in the tested examples). Stock is normalized to `inStock`, `outOfStock`, `preorder`, `backorder`, `discontinued`, or `unknown`. Unmatched retailer offers remain explicitly marked with `OFFER_UNMATCHED_EDITION` rather than being silently assigned to an edition. Retailer stock can vary by region and time.

## Dataset views

The dataset schema provides:

- Overview — flattened title, market, license, release, availability, price, and stock fields.
- Licensing — license evidence and sources.
- Availability — official links and retail summary.
- Provenance — match, warnings, source records, and observation time.
- Detected changes — per-snapshot change summary.

The output schema links to the default dataset, `RUN_SUMMARY`, and `CHANGE_REPORT` through Apify Console templates.

## Cost and runtime

The default path uses no proxy or secret, disables retailer collection, and has 180-second soft / 240-second hard deadlines. Ten local exact-default repetitions completed successfully; the slowest observed wall time was 8.05 seconds. Optional retailer and change-detection settings add source work. See [`docs/COST_REPORT.md`](docs/COST_REPORT.md).

## Known limitations

- Coverage depends on public source availability and source policy/terms.
- The Actor returns metadata and public availability signals; it does not download chapters, pages, images, or OCR content.
- `notFound` or `unknown` does not prove a title is unlicensed.
- Release dates and stock information can change after collection.
- Retailer stock may vary by delivery region.
- Omnibus and special-edition matching may require manual review.
- Publisher calendar and availability-monitor modes are not runnable yet.

## Responsible use

Use only where collection and downstream use are lawful. Respect robots instructions, terms, rate limits, and source attribution. Do not use this Actor to obtain or redistribute manga content. Users remain responsible for validating source permissions and the accuracy or freshness of decisions based on the data.

## FAQ

### Does this Actor download manga?

No. It collects metadata and public availability or commerce signals only.

### Does `unknown` mean unlicensed?

No. It means the tested sources did not provide sufficient evidence.

### Why is an offer unmatched?

The retailer page did not expose enough ISBN/edition evidence to safely assign it. The offer is retained with a warning for review.

### Can I use all input modes now?

No. `titleLookup` is the current runnable mode; calendar and monitoring modes are roadmap items.

### Can the Actor publish or change pricing?

No. Publication and pricing decisions are intentionally outside the Actor.

## Roadmap

1. Implement publisher-calendar and availability-monitor modes.
2. Expand source permission review and tested market coverage.
3. Add larger live benchmark coverage and source schema-change detection.
4. Improve manual-review exports for difficult edition families.

## Store keywords

`manga data`, `manga release tracker`, `manga licensing`, `manga availability`, `manga price tracker`, `manga stock monitor`, `manga publisher data`, `manga volume releases`, `localized manga editions`, `manga ISBN`, `official manga availability`, `manga release gap`, `manga market intelligence`, `English manga releases`, `Vietnamese manga releases`.

Recommended categories: **E-commerce** primary and **Other** secondary.
