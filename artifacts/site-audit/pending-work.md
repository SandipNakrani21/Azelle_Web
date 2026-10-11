# Azelle — current pending work

Updated 11 October 2026. This replaces the earlier backlog after the 36-issue fixing pass. See [fix status](./fix-status.md), [owner inputs](./owner-inputs.md) and [dummy setup](./dummy-setup.md).

## Three remaining audit findings

| Finding | Current status | Remaining work |
|---|---|---|
| 11 — Password recovery delivery | Local dummy email implemented and tested. Links are saved privately; no email is sent. | Supply verified sender/mail settings, then verify actual delivery, failures and recovery on the final domain. |
| 12 — Business disclosures | Your name/address are applied. Missing fields have a clearly labelled private draft template. | Supply GSTIN, manufacturer identity/address and named grievance officer/contact. Apply verified disclosures and invoice details. |
| 26 — Entity evidence | Supplied business facts appear in content and organization data. | Align manufacturer/grievance facts with verified records. Add independent claim evidence only where available; your claim approval is already recorded. |

Findings 12 and 26 share inputs but remain separately tracked. Dummy fields are not published as business facts.

## Ordered backlog

| Priority | Work | Status / completion condition |
|---|---|---|
| 1 | Local dummy configuration | Started: private email outbox, both payment adapters and both courier adapters tested. Missing business details have a separate draft template. |
| 2 | Complete customer/admin order journey | Next: checkout, customer history, admin fulfilment, support/invoice requests, cancellation and refund together. Adapter checks passed; this full journey remains pending. |
| 3 | Email and business disclosures | Finish findings 11, 12 and 26 when actual details arrive. |
| 4 | Shipping, tax and policy approval | Confirm existing ₹100 shipping, GST calculation, COD rules, service areas, dispatch/delivery, returns/refunds and invoices. Verify matching totals and wording through an order. |
| 5 | Actual payment and courier setup | Choose partners; configure genuine sandbox credentials securely; verify callbacks/webhooks, failures, abandonment and refunds. Confirm warehouse/parcel facts before actual shipping. |
| 6 | Launch catalogue and evidence | Confirm prices, stock, variants, descriptions and images. Add genuine reviews/testimonials/stockists when supplied. Gender filtering is optional and needs classifications first. |
| 7 | Deployment and domain | Configure domain, database, storage, secrets and server rendering. Verify redirects, HTTP 404s, caching, image fallback, cookies and protected routes on the deployed site. |
| 8 | Responsive, accessibility and motion regression | Extend local breakpoint checks to real devices/browsers, keyboard/screen-reader use, reduced motion, video failure and data-saving behavior. Add repeatable critical-interaction checks. |
| 9 | Measured performance | Run production cold-cache/throttled checks; record LCP, INP and CLS and fix measured bottlenecks. Build success is not a speed score. |
| 10 | Build-tool maintenance | Review/migrate the Tailwind 3 dependency chain with visual checks. Seven build-tool dependency findings remained after earlier safe updates; backend audit was clear at that check. |
| 11 | Actual analytics | Confirm intended collection, consent and retention; configure actual project and verify production tags/disclosures. Dummy identifiers remain local. |
| 12 | Search and answer-engine launch verification | Validate deployed metadata/schema, sitemap/indexing in Search Console/Bing and intended AI crawler access. Monitor visibility; schema or llms.txt cannot guarantee inclusion. |

## Completed baseline

The fixing pass addressed 33 findings: shared product layouts, hero readability/media assets, responsive controls, crawlable server-rendered content, metadata/schema/sitemap, persistent support forms, motion controls, recovery security, error handling and consent-aware analytics. Imperium 2 is excluded from the public catalogue and redirects to Imperium. The alternate homepage remains internal. Placeholder public reviews, testimonials and stockists were removed.

These implementation changes are completed; production and broader regression checks are tracked above. Previous validation is in [fix status](./fix-status.md).
