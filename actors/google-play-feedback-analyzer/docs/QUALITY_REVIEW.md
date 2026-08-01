# Quality review

## Verified

- Review IDs, ratings, dates, helpful counts, optional replies, locale, and country provenance are structurally tested.
- Normalized feedback is validated against shared core v1.
- Analysis output is schema-validated through the shared fallback and injected-provider tests.
- Cross-app clustering isolation, partial analysis tolerance, release-window boundaries, and structured insufficient-data warnings are tested.
- The five-app operational benchmark completed with 0 collection errors and 0 analysis failures.

## Not yet measured

- Feedback-type accuracy, topic accuracy, severity reasonableness, summary faithfulness, false bug-report rate, and cluster coherence.
- A 50-English/50-Vietnamese manually labeled evaluation set; the current redacted fixtures contain 9 English and 9 Vietnamese review-shaped records without text.
- Human evaluation of sarcasm, vague complaints, multiple issues, subscription complaints, advertising complaints, and compatibility reports.

These omissions are publication caveats, not substituted estimates. The Actor must not present deterministic fallback classifications as human-validated accuracy.
