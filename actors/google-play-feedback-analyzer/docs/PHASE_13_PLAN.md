# Phase 13 plan — Quality validation and benchmark

1. Define a reproducible benchmark matrix covering a global app, subscription app, ad-supported app, low-rating complaint sample, and English/Vietnamese coverage.
2. Add redacted fixture labels and manual-review templates without claiming unmeasured accuracy.
3. Measure raw collection success, schema validity, analysis behavior, cluster isolation/coherence, release-window correctness, runtime, response size, and retry/failure counts.
4. Record local benchmark results and explicitly separate observed measurements from publication targets.
5. Update README, benchmark notes, changelog, and phase report together.
6. Run the complete test/lint/format/schema/diff gate and bounded live benchmark before closing the phase.
