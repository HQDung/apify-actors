# Changelog

## Unreleased

- Added opt-in bounded website enrichment with canonical-domain deduplication, same-domain redirect validation, abortable request deadlines, a 30-second domain budget, HTML-only parsing, and directory fallback on failure.
- Added explicit website extraction for business emails, phones, contact names, social links, descriptions, services, and industries with source provenance.
- Added website attempts, success, failure, page, contact, service, industry, retry, and domain-timeout metrics to `OUTPUT`.
- Added website fixtures and regression coverage for extraction, duplicate domains, retries, redirects, invalid content, timeouts, and disabled enrichment.
- Build 0.1.8 passed the 15-case directory-only cloud regression with usable results in every case and no QuickBooks source failures.
- The build 0.1.8 website gate preserved all directory rows but enriched 6 of 17 domains; redirect canonicalization and failed-attempt website provenance remain release blockers.
