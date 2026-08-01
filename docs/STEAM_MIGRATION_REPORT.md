# Steam Migration Report

Date: 2026-08-01

## Migration result

The Steam Actor now consumes `@project/feedback-analysis-core` version `1.0.0`
from the committed Actor-local artifact
`vendor/project-feedback-analysis-core-1.0.0.tgz`. Source-specific collection,
normalization, Steam taxonomy, and output mapping remain in the Actor.

## Compatibility evidence

- 47 Steam tests pass across 14 files.
- 10 shared-core tests pass.
- 8 deterministic regression tests pass; the live smoke is opt-in.
- Baseline comparison reports valid with zero errors.
- Input, dataset, and output schemas validate.
- Release-file validation reports valid with zero errors.
- Clean `npm ci --ignore-scripts --offline` resolves the local core artifact
  after the existing registry cache is populated; the first offline attempt
  required one missing public npm dependency, then the network-enabled install
  completed without package changes.
- Packaged local Actor smoke: 1 app, 3 reviews, 3 analyses, 0 errors, report
  saved, runtime `0.754s`.

## Runtime and cost

The committed Phase 0 public baseline processed 10 reviews in `0.866s`; the
packaged Phase 6 smoke processed 3 reviews in `0.754s`. These are bounded local
runs and are not a controlled performance benchmark. The deterministic fallback
uses no paid AI provider, so analysis-provider cost was `$0` for these runs.

## Rollback

Rollback is the previous checkpoint commit before the core package dependency
(`df484a9`), followed by the Phase 1 regression gate. No Steam cloud deployment
or publication occurred in this phase.

## Known limitations

- Provider-backed AI analysis remains optional and is not enabled by default.
- Steam fallback heuristics remain source-specific for exact backward
  compatibility; the shared core owns the invocation/validation boundary.
- Package publication to a registry is not required; Actor builds use the
  explicit local tarball packaging step.
