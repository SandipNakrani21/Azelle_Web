# Azelle website audit — 10 October 2026

This report separates observed defects, confirmed code gaps, design recommendations, and risks needing further testing. No website fixes were made during this audit.

## Coverage and results

Reviewed the storefront routing, shared layout, homepage sections, collection, product gallery and purchase layout, account metadata, cart/checkout source, information pages, content sources, image delivery, search metadata, and shared motion/accessibility hooks. Authenticated admin operations and real purchases were not exercised.

| Screen | Verified browser viewport | Result |
| --- | --- | --- |
| Large desktop | 1920 × 1080 | Home layout and collection fit; product columns work at desktop widths. Floating controls compete on the right. |
| Desktop | 1366 × 768 | Home header and hero fit. Product purchase controls sit below the initial viewport. |
| Tablet | 768 × 1024 | Navigation collapses to the mobile menu; home and collection reflow. Product gallery becomes a large block above details. |
| Mobile | 390 × 844 | Home reflows and menu opens/closes. Floating controls overlap content. Collection controls wrap into a tall stack. |
| Small mobile | 320 × 720 | Header fits; hero title wraps to three lines. Floating controls obscure copy and the footnote needs better wrapping. |

Settled homepage document widths did not show horizontal overflow at these sizes. Thumbnail strips intentionally scroll horizontally. Temporary browser viewport changes require settling before measurements; early transitional measurements were excluded from pass/fail conclusions. This is responsive browser testing, not certification on physical devices or every route at every width.

`npm run build` passed, including TypeScript checking. Production output: main JS 290.98 kB / 89.47 kB gzip, shared JSX runtime 49.03 kB / 17.47 kB gzip, CSS 109.74 kB / 22.46 kB gzip. These are bundle sizes, not measured load-time or Core Web Vitals scores.

## Issue list

Priority: **P1** = resolve before launch; **P2** = important improvement; **P3** = polish or maintenance. “Risk” means the implementation is confirmed but its user impact needs further measurement.

### Content, SEO, AEO, GEO and LLMO

1. **P1 · Shipping promises contradict pricing. Confirmed.** Homepage, product reassurance and shipping policy say free/complimentary shipping on every order. Commerce configuration charges ₹100 unless a free-shipping coupon applies. Buyers receive conflicting answers, and search/AI systems can extract the wrong policy. Evidence: [content.ts](D:/Azelle_Web/src/lib/content.ts:7), [shipping policy](D:/Azelle_Web/src/content/infoPages.ts:407), [GoodToKnow.tsx](D:/Azelle_Web/src/components/product/GoodToKnow.tsx:72), [commerce configuration](D:/Azelle_Web/server/src/commerce.config.js:20).

2. **P1 · Homepage testimonials, stockists and brand promises are explicitly placeholder content. Confirmed.** The source warns that they are stand-ins. Reviews mention Midnight Osmanthus, Smoked Cedar, Crystal Neroli and Powder Rose, which do not match the displayed five-product catalogue. Claims about samples, refills and natural absolutes need verification. This weakens trust and answer accuracy. Evidence: [content.ts](D:/Azelle_Web/src/lib/content.ts:1), [Reviews.tsx](D:/Azelle_Web/src/components/home/Reviews.tsx:6). Replace or hide unverified content; do not add review schema around it.

3. **P1 · Important homepage text depends on scrolling to exist in the DOM. Confirmed architecture; crawl risk.** The lower eight sections are absent initially and mount when their observer comes near the viewport. Observed zero lower sections at the top and eight after scrolling. A crawler that does not scroll can miss them. Evidence: [DeferredHome.tsx](D:/Azelle_Web/src/components/home/DeferredHome.tsx:4). Google explicitly advises against requiring interaction to load searchable content: [lazy-loading guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading). Defer media and expensive effects while keeping important text available.

4. **P2 · Core storefront metadata is not route-specific; titles leak between pages. Confirmed live.** Account → Home → Collection retained “Account — Azelle Fragrances.” Product pages also use the generic initial title. One description in the HTML serves different products and policies. Evidence: [index.html](D:/Azelle_Web/index.html), [Account.tsx](D:/Azelle_Web/src/pages/Account.tsx:13), [App.tsx](D:/Azelle_Web/src/App.tsx). Centralize title/description management and reset on every route.

5. **P2 · Initial public HTML contains only an empty application root. Confirmed architecture; rendering risk.** Public content depends on JavaScript and API completion. Google can render JavaScript, but render-dependent discovery is less robust and some other crawlers may not render it. Evidence: [index.html](D:/Azelle_Web/index.html), [main.tsx](D:/Azelle_Web/src/main.tsx:12). Evaluate prerendering or server rendering for public product, collection and information URLs; this is not proof that Google cannot index the site. [Google JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

6. **P2 · Canonical URLs and a faceted-URL indexing strategy are missing. Confirmed code gap.** Collection search, sort, pagination, note and family parameters create many URL variants. No canonical markup or deliberate index/noindex policy was found. Evidence: [Collection.tsx](D:/Azelle_Web/src/pages/Collection.tsx:32), [index.html](D:/Azelle_Web/index.html). Decide which useful category URLs deserve indexing; do not indiscriminately canonicalize every category to an unrelated page.

7. **P2 · Product, Offer, Organization and Breadcrumb structured data are missing. Confirmed code gap.** Product names, prices, stock and breadcrumbs are visible but not expressed in JSON-LD. Add schema from the same verified catalogue data; validate price currency, availability and selected/canonical offer behavior. Absence does not prevent indexing or guarantee a ranking penalty. Evidence: [Product.tsx](D:/Azelle_Web/src/pages/Product.tsx:84), [index.html](D:/Azelle_Web/index.html).

8. **P2 · Private and utility pages have no explicit indexing controls. Confirmed code gap.** Account, checkout, order, admin login and mock-payment routes have no route-specific `noindex` found in source. Authentication protects data but does not define indexing policy for public shells. Evidence: [App.tsx](D:/Azelle_Web/src/App.tsx). Add appropriate meta/header controls; robots exclusions alone are not a substitute for `noindex`.

9. **P2 · Missing URLs can become soft 404s. Configuration risk.** A client NotFound screen exists, but the deployment rewrites all paths to the SPA HTML. Invalid product/page responses need proper HTTP handling or a tested rendering/indexing strategy. Evidence: [vercel.json](D:/Azelle_Web/vercel.json), [NotFound.tsx](D:/Azelle_Web/src/pages/NotFound.tsx). Deployed HTTP status behavior still needs verification.

10. **P2 · No sitemap/robots implementation was found. Confirmed gap.** Local `/robots.txt` returned 200 with the application HTML, not a robots document. A sitemap should enumerate canonical public URLs and omit private/test pages. Missing robots.txt is not automatically a crawl block; the current fallback response is the problem to resolve. Evidence: [vercel.json](D:/Azelle_Web/vercel.json), [public directory](D:/Azelle_Web/public).

11. **P2 · Product and brand facts need a single verified content source. Content architecture gap.** Homepage copy, product features, illustrations and policies express concentration, longevity, ingredients, samples and shipping separately. For example, the illustrated bottles always say “PERFUME EXTRACT,” while catalogue concentration varies. Evidence: [Bottle.tsx](D:/Azelle_Web/src/components/ui/Bottle.tsx:65), [content.ts](D:/Azelle_Web/src/lib/content.ts:65), [Product.tsx](D:/Azelle_Web/src/pages/Product.tsx:28). Existing Help content is useful; strengthen product-specific answers and evidence rather than producing generic AI keyword copy.

12. **P3 · Social sharing metadata and an explicit favicon are absent from the HTML. Confirmed gap.** No Open Graph/Twitter title, description or image markup was found. Shared product links may show generic or unsuitable previews. Evidence: [index.html](D:/Azelle_Web/index.html).

### Responsiveness, UI and UX

13. **P2 · Theme design control overlaps storefront content. Observed.** At mobile widths the fixed swatch covers hero text/buttons or cards; it also competes with the announcement ribbon. It is currently enabled in this environment. Evidence: [theme visibility flag](D:/Azelle_Web/src/lib/themes.ts:65), [mobile screenshot](C:/Users/sandi/.codex/visualizations/2026/10/10/01a12523-138e-73d0-aa80-06a4eed0ed7f/audit-mobile.png). Disable the design tool in the customer-facing build or relocate it into a deliberate settings area.

14. **P2 · The announcement ribbon intrudes into mobile controls and content. Observed.** The fixed right-side tab overlaps the collection filter/sort area and narrow-phone hero copy. It has no reserved layout space. Evidence: [AnnouncementCenter.tsx](D:/Azelle_Web/src/components/announcements/AnnouncementCenter.tsx:118), [index.css](D:/Azelle_Web/src/index.css:1265). Use a compact placement that avoids shopping controls and respects overlays.

15. **P2 · Purchase actions require too much scrolling. Design recommendation based on observed layouts.** Mobile/tablet show the full gallery before details, description, feature strip, price, sizes and actions. Desktop gallery height matches the long details card, adding whitespace around the image; actions fall below the initial viewport. Evidence: [ProductGallery.tsx](D:/Azelle_Web/src/components/product/ProductGallery.tsx:73), [Product.tsx](D:/Azelle_Web/src/pages/Product.tsx:193). Reorder price/size/actions earlier and evaluate a compact mobile purchase bar.

16. **P2 · Hero illustration and physical product photography depict different packaging. Observed consistency issue.** Pastel illustrated White Oud/Urban Voyage bottles differ substantially from catalogue packshots. The effect is attractive but can misrepresent what is purchased. Evidence: [Hero.tsx](D:/Azelle_Web/src/components/home/Hero.tsx), [Bottle.tsx](D:/Azelle_Web/src/components/ui/Bottle.tsx), [large desktop screenshot](C:/Users/sandi/.codex/visualizations/2026/10/10/01a12523-138e-73d0-aa80-06a4eed0ed7f/audit-large-desktop.png). Create dimensional styling using accurate product assets.

17. **P3 · About-section “Read more” goes to the collection. Confirmed.** The destination does not expand the house story promised by the section. Evidence: [HouseSplit.tsx](D:/Azelle_Web/src/components/home/HouseSplit.tsx:33). Link to the existing Our Story page and use a specific label.

18. **P3 · Small-phone hero footnote is cramped and partly obscured. Observed at 320 px.** The single-line-looking footnote extends toward the floating ribbon and loses readability. Evidence: [Hero.tsx](D:/Azelle_Web/src/components/home/Hero.tsx), [mobile hero CSS](D:/Azelle_Web/src/index.css:2112). Allow controlled wrapping and protect the text area.

19. **P2 · Gender shopping is unfinished; bestseller selection is not based on sales. Confirmed.** Gender selections do not participate in the filter predicate, and the page explicitly says tags are being added. “Bestsellers” takes the first items in catalogue order. Evidence: [Collection.tsx](D:/Azelle_Web/src/pages/Collection.tsx:93), [gender notice](D:/Azelle_Web/src/pages/Collection.tsx:251). Complete product tags and define a verified bestseller/curation model, or rename/hide these sections.

### Motion, accessibility and code architecture

20. **P2 · Automatically moving marquees have no user pause control. Confirmed source gap.** Reduced-motion users get a static version and offscreen loops are paused, which are good safeguards. However, users viewing the continuously moving text have no explicit pause button. Evidence: [Marquee.tsx](D:/Azelle_Web/src/components/ui/Marquee.tsx), [useVisibleMotion.ts](D:/Azelle_Web/src/hooks/useVisibleMotion.ts). Add a pause/resume mechanism and validate keyboard behavior.

21. **P3 · Review carousel lacks a named carousel container and slide-change announcement. Confirmed source gap.** Navigation buttons are labeled and nonvisible slides are inert, but the carousel wrapper has only `aria-roledescription` and no slide position/live status. Evidence: [Reviews.tsx](D:/Azelle_Web/src/components/home/Reviews.tsx:76). Provide a named region and restrained announcements after user navigation.

22. **P2 · Lazy route failures have no application error boundary. Confirmed architecture gap.** Suspense handles loading but there is no error boundary around route imports. A stale deployment chunk or network failure can produce an unrecoverable screen. Evidence: [App.tsx](D:/Azelle_Web/src/App.tsx:42), [main.tsx](D:/Azelle_Web/src/main.tsx). Add a recoverable error view with retry/reload and useful diagnostics.

23. **P2 · Homepage loading reserves a fixed 3600 px regardless of content or device. Confirmed implementation; layout-shift risk.** Once lower content mounts, its actual height replaces this reservation. It can move the footer and change scroll position, especially across mobile/desktop layouts. No numeric CLS score was measured. Evidence: [DeferredHome.tsx](D:/Azelle_Web/src/components/home/DeferredHome.tsx:19), [index.css](D:/Azelle_Web/src/index.css:2322).

24. **P2 · Image optimization covers a hardcoded existing asset set. Confirmed architecture gap.** `sized()` returns the original upload unchanged unless its path is in `OPTIMIZED_IMAGES`. Newly uploaded large images can reintroduce heavy transfers. Evidence: [images.ts](D:/Azelle_Web/src/lib/images.ts:5), [imageVariants.ts](D:/Azelle_Web/src/lib/imageVariants.ts). Move variant generation into the upload/media pipeline and define fallbacks for missing variants.

25. **P3 · House image responsive-size declaration does not match tablet layout. Confirmed.** The section is one column until `lg`, but its image `sizes` declares 400 px from 768 px. Browsers may select an undersized image for the wider tablet slot. Evidence: [HouseSplit.tsx](D:/Azelle_Web/src/components/home/HouseSplit.tsx:15), [image sizes](D:/Azelle_Web/src/components/home/HouseSplit.tsx:40).

26. **P3 · Motion/glass styles have overlapping generations of overrides. Confirmed maintainability issue.** Reveal names, scroll drift and glossy styles are declared in multiple blocks, with later declarations replacing earlier ones. This complicates tuning and regressions; it does not by itself prove frame-rate loss. Evidence: [earlier reveal rules](D:/Azelle_Web/src/index.css:1361), [later motion rules](D:/Azelle_Web/src/index.css:2337).

27. **P2 · No automated storefront regression test suite was found. Confirmed gap.** Package scripts provide build/typecheck but no responsive, accessibility or interaction regression checks. Server seed scripts named “test” are not a storefront test suite. Evidence: [package.json](D:/Azelle_Web/package.json). Prioritize meaningful navigation/filter/cart and viewport tests.

## Motion review: safeguards already present

- Global reduced-motion CSS forces animation/transition duration down and stops looping effects. It also overrides inline carousel transition duration; the review slider should not be described as ignoring reduced motion.
- Reveal effects use IntersectionObserver rather than repeated scroll-event layout scans.
- Hero depth and scroll progress use feature-detected native scroll timelines. Unsupported browsers receive a simpler experience; they need validation, not an unconditional heavy polyfill.
- Most tracked decorative loops pause offscreen and when the tab is hidden. The announcement pulse is outside the tracked selector set and should be included in the motion budget review.
- Product actions have named controls and focus-visible styling; mobile header has named controls. Product images support arrow keys and announce the current image count.
- First-hover alternate imagery loads on pointer intent. The first image remains underneath, so a blank crossfade was not established. Slow-network hover and gallery swaps still need testing.

## What remains unverified

Real-device scroll frame rates and battery cost; numerical LCP/INP/CLS; Safari/Firefox behavior; contrast ratios over every gradient state; 200%/400% zoom and screen-reader interactions; all authenticated account/checkout/admin layouts; gateway/courier operations; live indexing/status codes; deployment caching; live analytics collection. No score or guarantee is assigned to these.

Focus trapping, Escape and body scroll locking exist. Background inertness and nested-dialog focus/scroll restoration need assistive-technology testing; absence of explicit background `inert` alone is not reported as a proven screen-reader failure.

For AEO/GEO/LLMO, prioritize crawlable, accurate, clearly structured answers and consistent business/product facts. There is no guaranteed “AI optimization score.” Google states that normal SEO practices remain applicable and that special AI files or special schema are not required for AI Overviews/AI Mode: [official AI features guidance](https://developers.google.com/search/docs/appearance/ai-features). An `llms.txt` file is optional experimentation, not a launch requirement.
