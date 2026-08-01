# Phase 9 Plan — Google Play Normalized Source Contract

**Goal:** Add a Google Play source adapter that converts raw collection records into the neutral normalized-feedback contract without invoking analysis.

**Tasks:**

- Define Google Play source/product/feedback mappings and nullable date/version/device fields.
- Preserve star rating and developer reply metadata as source evidence.
- Add normalized-record validation and machine-readable source diagnostics.
- Add deduplication and locale-independent date handling where the public page provides enough evidence.
- Decide and test the browser-fallback boundary; keep it disabled by default unless a stable selector path is proven.
- Run the Actor smoke and update README, schemas, sample input, benchmark notes, and phase report together.

**Gate:** Normalized Google Play records validate against the shared core contract and remain analyzable by the core without Google Play-specific branching.
