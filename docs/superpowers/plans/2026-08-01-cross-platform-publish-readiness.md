# Phase 13 plan: final publish-readiness test

## Objective

Exercise the handoff’s final scenarios and verify that the Actor is ready for an explicit cloud smoke and publication decision.

## Implementation

1. Add a readiness matrix test for all modes and public artifact links.
2. Verify future/incomplete release inputs remain observable through warnings.
3. Verify partial source reports preserve warnings and successful data.
4. Run the complete Actor, core, source-adapter, schema, format, packaging, benchmark, and local-runtime checks.
5. Record external publication/cloud validation as an explicit gate without publishing automatically.

## Acceptance criteria

- All local readiness scenarios pass.
- No cross-product matches or unsupported README claims remain.
- Partial source failures do not crash or hide output.
- Schemas, examples, key-value links, and runtime stats are valid.
- Publication remains an explicit follow-up action.
