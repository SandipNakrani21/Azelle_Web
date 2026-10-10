# Azelle pending work — 10 October 2026

Separate implementation and verification backlog from [the audit issue list](D:/Azelle_Web/WEBSITE_AUDIT.md). These items remain open; creating this list does not mean fixes have been applied.

## Resolve before launch

- [ ] **Shipping and totals:** choose the actual policy, then synchronize commerce configuration, homepage, product reassurance, cart, shipping policy and help answers. Show applicable taxes/charges clearly. Verify coupon and no-coupon totals. Audit #1.
- [ ] **Verified content:** remove or replace placeholder testimonials/stockists. Confirm concentration, ingredients, origin, longevity, cruelty-free, refill and sample claims with the business. Make homepage and Our Story consistent. Audit #2 and #11.
- [ ] **Crawlable public pages:** keep important homepage text available without scrolling. Choose prerendering/server rendering for public URLs where appropriate; defer images/effects instead of essential content. Audit #3 and #5.
- [ ] **Metadata lifecycle:** unique product/category/policy titles and descriptions; reset metadata after every navigation, including Account → Home. Audit #4.
- [ ] **Indexing policy:** canonical rules for useful categories and query variants; noindex private/utility/test pages; deliberate HTTP 404 behavior. Audit #6, #8 and #9.
- [ ] **Search delivery:** serve valid robots.txt and sitemap.xml, declare canonical domain, submit sitemap and inspect representative rendered URLs in Search Console/Bing Webmaster Tools. Audit #10.

## Storefront improvements

- [ ] Remove the theme design control from customer builds; reposition or collapse the announcement tab on mobile. Recheck no control blocks a CTA, image arrow, field or copy. Audit #13 and #14.
- [ ] Bring product price, size and purchase actions earlier. Evaluate a mobile purchase bar and a less stretched desktop gallery while retaining uncropped packshots. Audit #15.
- [ ] Use accurate product cutouts/packaging in the dimensional hero; preserve brand gradients and glossy surfaces without misleading bottle artwork. Audit #16.
- [ ] Correct About “Read more” destination, wrap small-phone footnotes, and review fine text readability over glossy backgrounds. Audit #17 and #18.
- [ ] Complete gender tags and actual filtering. Define verified bestseller ordering, or rename the section to a curated selection. Audit #19.
- [ ] Add Product/Offer, Organization and Breadcrumb JSON-LD based on verified visible data. Include genuine rating data only; validate rich-result eligibility. Audit #7.
- [ ] Add route-specific social previews and favicon assets. Audit #12.
- [ ] Improve product-specific answers: scent profile, concentration, suitable occasions, realistic longevity, sizes, shipping, returns and care. Use concise visible answers and links to the full policies. Do not duplicate generic keyword text across products. Audit #11.

## Motion, performance and reliability

- [ ] Add user pause/resume to moving text and improve the review carousel's name/status announcement. Preserve existing reduced-motion and offscreen-pause safeguards. Audit #20 and #21.
- [ ] Consolidate reveal/glass/scroll-motion styles into one maintained set. Include announcement pulses in hidden-tab/offscreen policy where appropriate. Audit #26.
- [ ] Replace the fixed lower-page placeholder with reliable rendering/reservation. Verify fast scroll, footer navigation, hash targets and slow-network mounting. Audit #23.
- [ ] Generate responsive image variants for future uploads; verify `srcset`, actual slot sizes, missing-image handling and tablet House image selection. Audit #24 and #25.
- [ ] Add route error recovery for failed/stale chunks and test offline/API failure states without losing useful navigation. Audit #22.
- [ ] Establish meaningful interaction and responsive regression checks. Include metadata navigation, filters, product sizes, cart totals, overlay keyboard behavior and critical widths. Audit #27.

## Verification still pending

- [ ] Physical iPhone/Android and iPad checks, including landscape, notches/safe areas and touch scrolling; Safari, Chrome, Edge and Firefox. Include 320, 375/390, 768, 1024, 1366 and 1920 widths and breakpoint edges.
- [ ] Full authenticated account, wishlist, checkout, order and admin responsive walkthroughs using designated test accounts. No production purchase is required for this audit backlog.
- [ ] Keyboard-only navigation and screen readers; 200%/400% zoom; contrast measurements on gradients/cards; focus visibility; dialog nesting/restoration; reduced-motion changes while the page is already open.
- [ ] Production-preview performance traces on slow mobile/network: LCP, INP, CLS, image bytes, long tasks and scroll frame pacing. Initial targets: LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1 at the 75th percentile when sufficient real-user data is available, following [Google's Web Vitals guidance](https://web.dev/articles/vitals). Validate with measurements rather than assuming bundle size alone proves speed.
- [ ] Hover/gallery behavior on a cold cache and slow network; continuous loops in background tabs; scroll-timeline fallback; rapid navigation and fast scrolling; content still readable when animations cannot run.
- [ ] Live deployment response/status/canonical checks, search-engine rendered HTML, rich-result tests, sitemap coverage, caching and broken internal links. Local dev responses cannot establish live indexing quality.
- [ ] Business-owner verification of contact/entity information and every product/policy claim; confirm actual review provenance and stockist relationships before publishing them.
- [ ] Search/AI visibility measurement after launch: Search Console, Bing and referral/conversion reporting. Track results over time; adding special AI text files is not a substitute for these fundamentals.

Suggested sequence: finish the six launch items, fix mobile obstructions and purchase layout, complete media/error/motion work, then run the full device/accessibility/production verification pass.
