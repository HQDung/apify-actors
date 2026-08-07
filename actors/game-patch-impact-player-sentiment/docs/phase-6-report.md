# Phase 6 Report — Cloud Validation and Publication

Date: 2026-08-07

## Cloud validation

Build `0.1.1` (`7vtd1NcoXkorO3aze`) was pushed to Actor `ZFrA2SSephNkHtKY0` and validated with 256 MB cloud runs. The default, latest-patch fallback, custom-date, two-game, and invalid-style inputs all completed with exit code 0. The default produced one `ok` dataset item with full/full coverage, 40 before/40 after samples, no warnings, 300 scanned reviews, and 80 analyzed reviews. The fallback case kept `PATCH_DETECTION_FALLBACK`; the invalid-style case produced one safe `partial` insufficient-data report.

Detailed readiness evidence is in [`publish-readiness-report.md`](publish-readiness-report.md). The Actor was then published at https://apify.com/obliging_persimmon_cki/game-patch-impact-player-sentiment.

## Post-publish verification

The published default call `40HgddaBo3jAVTsVK` succeeded with exit code 0 on build `0.1.1`. Its dataset `tdgUyjmCHIVUax47x` contained one `ok` report for Slay the Spire, with 40 before / 40 after analyzed reviews, full/full coverage, and no warnings. `RUN_STATS` in key-value store `gLStGQBHdtrVMUJxs` reported 300 scanned reviews, 80 analyzed reviews, 3 review pages, and 1,169 ms total runtime. The run used 256 MB allocation and peaked at 39.32 MB. Pricing was not changed.
