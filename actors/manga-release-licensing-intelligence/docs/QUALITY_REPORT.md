# Quality report

Checked 2026-08-05.

| Quality target | Evidence | Result |
| --- | --- | --- |
| Default auto-test success | 10/10 exact `apify run --purge` repetitions exited 0 and produced one matched snapshot | Pass |
| Auto-test target runtime ≤120 seconds | Maximum observed wall time: 8.05 seconds | Pass |
| Internal runtime <240 seconds | Run summaries were 2–5 seconds | Pass |
| Canonical match accuracy ≥90% | 30/30 deterministic benchmark cases matched at ≥0.95 confidence | Pass |
| Edition match precision ≥90% | 10/10 compatible and 0/5 incompatible fixture outcomes | Pass |
| Dataset/output schema validity | `npm run validate:schema` passed all three schemas | Pass |
| Fatal failure from optional sources | Optional-source and retailer failure tests preserve snapshots | Pass |
| License false-positive rate <5% | Negative-source tests preserve `unknown`; no `unlicensed` status exists in the output path | Pass for tested fixtures |
| Complete release-gap provenance | Calculated fixture includes original metadata and localized edition sources | Pass |

The live default path logged an Open Library empty-result warning while retaining the Kitsu match and VIZ enrichment. This is expected partial-source behavior, not fabricated fallback data.
