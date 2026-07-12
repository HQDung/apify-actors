# Actor Factory Tooling Design

## Goal

Improve the reusable Actor template and generator without changing the nine existing Actor directories.

## Scope

- Keep each generated Actor self-contained and deployable from its own directory.
- Move reusable scraper behavior into modules inside the template's `src/` directory.
- Keep generated entry points small and niche configuration-driven.
- Add static contract validation for generated Actors.
- Add a repeatable local benchmark workflow and repository-level benchmark/roadmap documents.
- Do not publish, change pricing, or add dependencies.

## Architecture

The template will own the deployable runtime. `src/main.js` will read generated niche configuration and delegate to template-local scraper modules. The generator will render that configuration, schemas, README, sample input, and benchmark checklist from the niche JSON.

The shared runtime will remain under `templates/lead-scraper-template/src/` and be copied into generated Actor folders. No generated Actor will import runtime code from the factory root, so `apify push` continues to work from an Actor directory.

## Validation

The factory will provide a static validator that confirms an Actor has valid JSON schemas, no generator placeholders, matching runtime/schema/documented fields, a sample input, and benchmark metadata. Tests will cover the generator and validator using temporary output directories; existing Actors are not regenerated in this phase.

## Benchmarking

Each niche spec will contain benchmark inputs. A local benchmark runner will execute an Actor through `apify run`, read its local dataset, and append structured results to the repository benchmark log. Benchmark execution remains manual and local-only; cloud testing and publishing require a separate decision.

## Out of Scope

- Migrating or regenerating the nine existing Actors.
- Changing scraper selectors, proxy defaults, pricing, or marketplace publication.
- Adding dependencies.
