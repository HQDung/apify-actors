# Changelog

## Unreleased

- Added opt-in bounded website enrichment with canonical-domain deduplication, same-domain redirect validation, abortable request deadlines, a 30-second domain budget, HTML-only parsing, and directory fallback on failure.
- Added explicit website extraction for business emails, phones, contact names, social links, descriptions, services, and industries with source provenance.
- Added website attempts, success, failure, page, contact, service, industry, retry, and domain-timeout metrics to `OUTPUT`.
- Added website fixtures and regression coverage for extraction, duplicate domains, retries, redirects, invalid content, timeouts, and disabled enrichment.
- Completed Phase 5 implementation and prepared the actor for the private Phase 7 cloud benchmark gate.
