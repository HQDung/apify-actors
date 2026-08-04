# Phase 18 report — Store default-input readiness

## Result

Phase 18 is complete. The Store automation startup issue was traced to a required input with no schema default. The Actor now exposes `appIds: ["com.todoist"]` as its bounded default, and the public `latest` build runs successfully with schema-generated defaults.

## Root cause

The published schema declared `appIds` as required but omitted a `default`. Reproducing the automation-style empty input against the published Actor failed before startup with:

`Input is not valid: Field input.appIds is required`

The existing standard sample was valid, but it did not supply a schema default for Store automation to use.

## Changes

- Added `default: ["com.todoist"]` to `.actor/input_schema.json`.
- Made the standard sample explicit about `mode: "reviews"` and retained the bounded `com.todoist` example.
- Documented the default in README and benchmark notes.
- Added `test/default-input.test.mjs`, which builds an input from schema defaults and passes it through `normalizeInput`.

## Verification

- Default regression test: passed.
- Full Actor tests: 28 passing.
- Lint: passed.
- Input schema validation: passed.
- Local run with only `{"appIds":["com.todoist"]}`: succeeded with 5 records, 0 errors, 1 aggregate report.
- Cloud build `0.1.5` / `latest`: succeeded; build ID `sc1GqnsyzSNSkb4mI`.
- Cloud minimal-input run `8vQC7z3NRVExgFKx7`: succeeded with 5 records, 0 errors, `APP_REPORT_com_todoist`, and `RUN_STATS`.
- Cloud full schema-default run `NhRHe22GjCthxMimm`: succeeded with 5 records, 0 errors, 1 aggregate report, and `RUN_STATS`.
- Published schema verification: `isPublic: true`, `latest: 0.1.5`, `appIds.default: ["com.todoist"]`, and `appIds` remains the only required field.

The raw empty object `{}` remains invalid by design because `appIds` is still required; Store automation must use the schema-generated default input, which is now populated and verified.
