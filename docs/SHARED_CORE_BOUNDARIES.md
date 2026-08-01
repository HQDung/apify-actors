# Shared Feedback Analysis Core Boundaries

Date: 2026-08-01

## Boundary rule

Source adapters produce a normalized feedback record. The shared core consumes
only that record plus an explicit taxonomy/provider/configuration object. Actor
runtimes own collection, lifecycle, storage, logging wiring, source schemas,
and source-compatible output mapping.

```text
Steam adapter ───────┐
                     ├─> NormalizedFeedback ─> core analysis
Google Play adapter ─┘                         ├─> AnalysisResult
                                               ├─> ClusterRecord
                                               └─> AggregateReport
                                      Actor-specific output mappers
```

## Core-owned contracts

- `NormalizedFeedback`: source/product/feedback/author/environment context with
  nullable fields and no Steam or Google Play property names.
- `AnalysisResult`: analysis status, actionability, feedback types, sentiment,
  severity, topics, cautious issue/request evidence, language metadata, and
  model metadata.
- `AnalysisError`: machine-readable partial-failure information.
- `ClusterRecord` and review-to-cluster mapping keyed by product identity.
- `AggregateReport` and date-window comparison results.
- Taxonomy configuration and extension validation.
- Provider abstraction, prompt construction, strict parsing, retries,
  fallback classification, confidence normalization, and usage reporting.
- Text normalization, stable IDs, safe logging, cost statistics, and partial
  failure helpers.

## Actor-owned responsibilities

- Steam API requests, app ID extraction, pagination, review filters, Steam
  metadata, Steam-specific proxy/rate-limit behavior, and Steam-compatible
  output fields.
- Google Play collection, package-name extraction, country/locale request
  behavior, app metadata, pagination, and Google Play-specific source fields.
- Apify `Actor.init/exit`, dataset pushes, key-value-store writes, input schema,
  output schema, source-specific error routing, and README/store positioning.
- Source adapters map source records to `NormalizedFeedback` and map core
  results back to published Actor output.

## Contract invariants

1. `source.platform`, `source.sourceRecordId`, and product identity are always
   retained for provenance.
2. Missing device, operating-system, author, version, and edited timestamps stay
   `null`; the core never fabricates them.
3. Review opinions are described as reports/mentions, never confirmed bugs.
4. Clustering partitions by product identity and feedback type before similarity
   comparison, preventing cross-app/cross-game clusters.
5. Raw review records are emitted before or independently of analysis; an
   analysis/provider failure becomes a record-level error.
6. Taxonomy extensions are passed as data and validated at the adapter boundary;
   central core validation must not require a code change for every new source.
7. The core has no import from `apify`, source adapters, or Actor storage APIs.
8. Provider secrets are injected by the Actor; the core never reads global
   environment variables for credentials.

## Migration seams

| Existing seam | Target boundary | Compatibility action |
| --- | --- | --- |
| `steam/normalize-review.js` output | `NormalizedFeedback` + Steam output mapper | Preserve current Steam record in mapper |
| `analysis/fallback-analysis.js` | Core analyzer + Steam taxonomy extension | Keep existing topic IDs and deterministic model metadata |
| `analysis/analysis-schema.js` | Core validator | Validate configured taxonomy, not Steam constants |
| `cluster-reviews.js` | Core clustering | Replace `steamAppId` with product identity key |
| `aggregate-game-report.js` | Core aggregation + Steam report mapper | Preserve `gameFeedbackReport` and KVS key |
| `patch-impact.js` | Core date-window comparison | Keep `patchImpactReport` and non-causal wording |
| `runtime/process-game.js` | Actor orchestration around core functions | Keep raw push and partial failure behavior |

## Explicit non-goals

- No Apple App Store adapter in the first release.
- No direct Reddit scraping.
- No automatic Jira or Linear creation.
- No change to Steam pricing or automatic publication.
- No forced rename of existing Steam dataset/report fields solely for symmetry.
