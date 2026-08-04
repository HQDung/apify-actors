# Changelog

## Unreleased

- Use Steam app `730` as the safe default when an automation test omits both `steamAppIds` and `startUrls`.
- Keep explicit empty game selections invalid so accidental empty production runs remain visible.
- Copy the vendored analysis-core package before Docker dependency installation and align its lockfile checksum.

## Core v1 migration — 2026-08-01

- Extracted source-neutral contracts, taxonomy configuration, analysis,
  clustering, aggregation, and date-window comparison into the pinned
  `@project/feedback-analysis-core` `1.0.0` package artifact.
- Preserved Steam review, cluster, report, and patch-impact output contracts;
  regression comparison remains valid.
- Added a deterministic core packaging step for Actor-local Docker builds.

## 0.1.0 — 2026-07-31

- Added public Steam app-ID and Store URL collection.
- Added cursor-paginated raw review normalization with language, date, review-type, and purchase filters.
- Added deterministic English/Vietnamese feedback analysis with strict schema validation and failure isolation.
- Added per-game key-value-store reports and topic/request rankings.
- Added topic/type-partitioned duplicate issue clusters with stable IDs and review links.
- Added release validation, benchmark notes, compliance guidance, and local smoke fixtures.

The Actor is not published automatically and does not modify pricing.
