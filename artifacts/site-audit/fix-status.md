# Status of the 36 audit issues

Updated 11 October 2026. The original audit and backlog remain available separately. This report covers the issue-fixing pass, not deployment or a new design phase.

**33 findings addressed; 3 still require external configuration or verified business information (11, 12 and 26).** Those three have code/content improvements, but cannot honestly be marked fully complete. No production deployment or live email delivery was performed.

Follow-up: pending work has started with tested local dummy email, payment and courier configuration. The three remaining findings are included in [the updated backlog](./pending-work.md). Actual details needed are in [owner inputs](./owner-inputs.md); dummy business fields stay separate from public content.

Design follow-up: at the owner's request, the visible marquee, house-animation and hero-film pause buttons were removed. Reduced-motion behavior and automatic off-screen/background pausing remain where implemented. Earlier pause-control findings describe the original fixing pass; continuous-motion accessibility needs reassessment in the pending regression checks.

| Issue | Status | Change |
|---|---|---|
| 01 | Addressed | Continuous film shade protects hero text; the transparent content layout remains. |
| 02 | Addressed | Mobile collection heading and controls shortened; shop tabs use a horizontal strip. |
| 03 | Addressed | Product copy increased to 15 px; readable labels/service text; tablet details use one column through 1000 px. |
| 04 | Addressed | Product controls, review navigation and pause controls have larger hit areas; primary bottle failure falls back to an illustration. |
| 05 | Addressed | Alternate homepage removed from primary navigation; prototype route excluded from indexing and sitemap. |
| 06 | Addressed | House “Read more” opens the actual Our Story page. |
| 07 | Addressed | Imperium 2 excluded from public catalogue/detail API; public page permanently redirects to Imperium. Existing database records are preserved. |
| 08 | Addressed | Unfinished gender navigation/filter removed; existing gender-tab URLs show all fragrances. |
| 09 | Addressed | Bestseller catalogue order is Imperium, Conqueror, White Oud, matching the house display. |
| 10 | Addressed | Contact, bulk and GST requests persist to a protected admin support inbox; validation, rate limits, useful errors, reference numbers and busy states added. |
| 11 | Configuration required | Secure password-reset routes and forms implemented with hashed, expiring, single-use tokens and session revocation. SMTP settings, a verified sender and PUBLIC_SITE_URL are still needed. The UI reports unavailable delivery honestly. |
| 12 | Information required | Supplied Azelle Perfume name and Surat address replace placeholders. GSTIN is not supplied yet; named grievance officer and manufacturer details are also unverified. Support contact is labelled as support, not an invented officer. |
| 13 | Addressed | Shipping copy matches the current ₹100 checkout charge; eligible shipping coupons remain supported. |
| 14 | Addressed | Policies and product copy show GST separately; product pages also show the selected bottle total including GST before checkout. |
| 15 | Addressed | GST instructions direct customers to the working invoice-request/support flow instead of a nonexistent checkout field. |
| 16 | Addressed | Placeholder testimonials and stockists removed from home; sample reviews excluded from public lists and rating aggregates. No seed data was deleted. |
| 17 | Addressed by owner approval | Owner approved samples, cruelty-free, natural ingredient and refill claims. Approved claims retained; this is owner approval, not independent certification. |
| 18 | Addressed | Product, collection and information pages have distinct titles/descriptions. |
| 19 | Addressed | Canonical URLs omit filter/size parameters; filtered collection pages and private/utility routes have explicit indexing rules. |
| 20 | Addressed | Product/Offer, BreadcrumbList, Organization and WebSite JSON-LD added. Offers reflect GST-inclusive bottle prices; fictional ratings are omitted. |
| 21 | Addressed | Dynamic XML sitemap contains current public products and information pages. |
| 22 | Addressed | robots.txt and noindex rules added for private, utility and prototype pages. |
| 23 | Addressed locally | Home, collection, product and information HTML is rendered on the server, with matching initial data and client hydration. Production handler and deployment configuration prepared; live deployment verification remains in the backlog. |
| 24 | Addressed | Important homepage/product sections render immediately; scrolling controls motion rather than whether text exists. |
| 25 | Addressed | Product-specific answers cover scent, sizes, wear time and total price; a collection comparison link is provided. |
| 26 | Information required | Verified business name/address/contact appear in content and organization data. Manufacturer identity and formal grievance officer details require owner confirmation; independent claim evidence is not asserted. |
| 27 | Addressed | Per-page Open Graph and Twitter sharing metadata with actual image URLs. |
| 28 | Addressed | House pause/play is visible on touch screens; measured 120 × 44 px, without clipping. |
| 29 | Addressed | Marquee gets a visible pause/play control; placeholder moving stockists are removed from home. |
| 30 | Addressed | Hero uses a 24 KB poster, 244 KB mobile video and 1.08 MB desktop video, versus the original 4.22 MB. Metadata preload; reduced-motion/data-saving pause/static fallback; offscreen and hidden-page suspension preserved. |
| 31 | Addressed | Fifteen responsive matched-bottle variants generated at 200, 560 and 900 px; image helper supplies appropriate sources. |
| 32 | Addressed | Removed fixed-height scroll-loading placeholders; essential text mounts immediately and media keeps its layout dimensions. Field CLS measurement remains a production verification task. |
| 33 | Addressed | Shared details renamed ProductDetails and formatted; admin CSS split from storefront; theme and common typography/control rules moved into scoped style files. Further architecture work can be incremental. |
| 34 | Addressed with baseline checks | Repeatable build/type checks, 112 server-rendering/metadata/product assertions, API validation/access checks and CI workflow added; responsive and cart/motion checks recorded below. Real-device and full accessibility/performance automation remain backlog verification. |
| 35 | Addressed | Render/chunk failure boundary provides reload/home recovery; product image failure has a fallback. |
| 36 | Addressed | Analytics, account-linked visit identification and events require explicit opt-in. Essential-only selection stops collection; footer preferences allow changing the choice. |

## Verification completed

- Production client and server builds pass; 112 storefront assertions pass.
- API checks pass for catalogue/duplicate exclusion, review consistency, support validation/access, invalid reset tokens, robots, sitemap, production HTML and 404 responses.
- Formatting checks pass for the new shared rendering/support files.
- Home, collection and product pages checked at 1920, 1440, 768 and 390 px: no horizontal overflow. Additional 320 and 1024 px checks pass. See `fix-viewport-checks.json` and `fix-extra-viewport-checks.json`.
- Browser: selected 100 ml, added to cart, reloaded, retained the item, verified ₹999 + ₹179.82 GST + ₹100 shipping = ₹1,278.82, then removed the test cart item.
- Bestseller page displays exactly Imperium, Conqueror and White Oud.
- Hero video, marquee and house pause controls tested on mobile. Mobile video source and desktop optimized source confirmed.
- Product review link lands with the review heading below the fixed header. Product size query links select the requested bottle size.
- Contact test submitted and independently confirmed in MongoDB, reference `6acb76cf19bbf15920e95058`. It is labelled “QA storefront check”; no email was sent.
- Fresh browser page has no captured warning/error logs. Development preview remains running at http://localhost:5173/.

## Remaining inputs for this issue pass

1. SMTP mail-service configuration and verified sender, plus the production public URL, to enable and verify actual reset-email delivery (11).
2. GSTIN when available, manufacturer details and a named grievance officer/contact (12, 26).

The subsequent pending-work phase has started with local dummy configuration and adapter checks. Production performance scores, real-device/cross-browser coverage, actual payment/shipping acceptance and search-result eligibility remain pending.

Non-breaking dependency patches were also applied. Server dependency audit reports zero findings; seven build-tool dependency findings remain in the Tailwind 3 dependency tree, whose suggested migration is a separate major-version change.

Implementation references: [Google product structured data](https://developers.google.com/search/docs/appearance/structured-data/product-snippet), [Vercel function configuration](https://vercel.com/docs/project-configuration/vercel-json). These guide implementation and do not confirm production deployment or search eligibility.
