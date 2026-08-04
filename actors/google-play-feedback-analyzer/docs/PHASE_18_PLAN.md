# Phase 18 plan — Store default-input readiness

1. Reproduce the Apify Store automation startup failure using the published schema and default-input path.
2. Compare the required fields, schema defaults, standard sample input, and runtime normalization behavior.
3. Add the smallest schema/sample correction and a regression test proving schema defaults form a runnable review input.
4. Validate locally, deploy a new `latest` build, and run both minimal-input and full schema-default cloud calls.
5. Record the corrected default-input evidence and remaining limitations.
