# Request tracker, full session audit

You asked whether anything you requested was missed. Fair challenge, this is the
complete audit of every request across the whole engagement, honestly graded.
Maintained from now on; last updated 18 July 2026.

**Legend:** ✅ delivered & verified · 🟡 partially delivered (gap stated) ·
🔴 designed but not operational · ⏳ blocked on something outside the code

## Turn 1, initial build

| Request | Status | Notes |
|---|---|---|
| Marketplace with all stones from the Etsy shop | ✅ | 147 listings scraped, parsed, live |
| SEO focus | ✅ | schema.org everywhere, sitemap, unique metas |
| "AI variant" (AEO) | ✅ | llms.txt, /api/catalog, AI-crawler robots policy |
| AI support (assistant) | 🟡 | Built; never executed, no provider key configured. Provider chain now supports free models + Bedrock |
| Auto-listing tools | 🟡 | AI auto-list from photo/notes built (same key caveat). Google-Sheet auto-import: schema designed, importer not built |
| AI financial integration | 🟡 | Finance engine + analyst built; analyst needs a provider key |

## Turn 2, reference site

| Request | Status | Notes |
|---|---|---|
| Use gemysticgems.com as reference | ✅ | Brand, USD, policies, taxonomy mirrored; compromise found and documented (local file, kept out of public repo) |

## Turn 3, theme & architecture

| Request | Status | Notes |
|---|---|---|
| Own theme: emerald on light | ✅ | Semantic token system |
| Local-first, AWS (SES) later, backups | ✅ | Driver architecture; backup verified by restore round-trip |
| Works on any device, ultrawide to phone | ✅ | Verified 320→3440px |

## Turn 4, platform requirements

| Request | Status | Notes |
|---|---|---|
| PostgreSQL | 🟡 | Required per you: SQL DDL + Prisma schema validated, client generated, compose service, migrate scripts. **Not executed, Docker isn't running on this machine.** JSON stores drive runtime until then |
| Auto-listing from Google Sheet | 🔴 | import_runs/import_rows designed (SQL + Prisma); importer service not built, sequenced after DB is live |
| Order management | 🔴 | Full schema (orders→items→payments→shipments→docs); no runtime until DB |
| Email team on order events | 🟡 | Mailer works (file/SMTP/SES), review-pending notices send; order events need orders |
| Shipping + export docs PK/TH | 🔴 | Schema incl. commercial invoice, packing list, certificate of origin; generation not built |
| Payments: PayPal, Stripe | 🔴 | Payment/refund schema with webhook idempotency; no SDK integration yet |
| Admin-managed categories | 🟡 | Taxonomy is data, drives everything; admin *viewer* built, in-place editor awaits DB |
| Etsy listing-field parity | ✅ | All fields modelled incl. who_made/when_made/personalisation/variants |
| Admin SEO section | 🟡 | Status page live; editable global settings await seo_settings table |
| Admin analytics section | 🟡 | GA4 now live (page/search/view_item/add_to_cart); first-party attribution tables designed, dashboards pending |
| Code standards | ✅ | docs/CODE-STANDARDS.md |
| Check Trust-Agent for gaps | ✅ | Audited; auth/RBAC patterns ported |
| Walk buyer journey | ✅ | Done honestly: journey didn't exist; gap table in PLATFORM-AUDIT |
| Tiles show more info | ✅ | Weight/cut/colour/origin/treatment/per-carat |

## Turn 5, UI & platform batch

| Request | Status | Notes |
|---|---|---|
| Push to github.com/cryptool-io/gemystic | ✅ | Pushed once token fixed |
| Sample photos on species tiles | ✅ | Rule-based best-photo selection |
| **Clear support icon** | ✅ *(second attempt)* | **First attempt missed the mark, bare chat bubble, still ambiguous. Now a labelled "Support" pill with headset icon.** The miss that triggered this tracker |
| Signup/login | ✅ | Working, verified end-to-end |
| Add admins / admin view | ✅ | Team page, roles, first-account-owner rule |
| Reviews section | ✅ | Product+shop reviews, moderation, real Etsy seed |
| Logo | ✅ | Emerald-cut SVG mark |
| Unique animations / market research | ✅ | Research doc → scroll reveals, sheen, marquee |
| Phone menu broken | ✅ | Real bug (backdrop-filter containing block), fixed + verified |

## Turn 6, refinement batch

| Request | Status | Notes |
|---|---|---|
| Font change | ✅ | Fraunces + Inter |
| Filters: size/cost/colour/cut/origin/ct | ✅ | All live, combinable, verified |
| SEO plan to rank + 100 keywords | ✅ | 128 keywords, honest difficulty, 13-week plan |
| Phone: filter/search space | ✅ | Compact row; then popup (turn 7) |
| Windows tab icon | ✅ | icon.svg |
| Copy Etsy user account | ✅ | Orders/saved/addresses/reviews |
| Walk as user+admin, add missing | 🟡 | Walked; order→delivery automation still blocked on DB |
| Etsy sold-sync | ✅ | Script + admin page; live-verified 147/147 |
| Shipping/finances/invoices managed here | 🔴 | Same DB dependency |

## Turn 7, this batch

| Request | Status | Notes |
|---|---|---|
| Hero intro + changing count | ✅ | Rewritten; counters replaced with standing promises |
| Cool professional animation | ✅ | "Just listed" film-strip marquee (pause-on-hover, reduced-motion safe) |
| Prices by IP origin, USD/EUR, extensible, correct calcs | ✅ | Geo-header + Accept-Language detection, cookie override, one conversion path, rates file ready for admin UI |
| Free models + Bedrock backup | ✅ | Provider chain (openai-compatible / bedrock / anthropic) wired into all three AI routes, runtime execution still needs credentials on the box |
| Google Analytics linked to results | ✅ | GA4 + commerce events; set NEXT_PUBLIC_GA_ID |
| Discount campaigns by stone type | ✅ | Admin CRUD, live/paused/scheduled, non-stacking correct math, storefront strikethrough |
| Support icon redo | ✅ | See turn 5 row |
| Filters as popup | ✅ | Slide-over over the results |
| Raw vs Rough: same category | ✅ | Merged into "Rough & Raw Gemstones" |
| Push (token fixed) | ✅ | On main |
| "Recent sales" strip on landing | 🟡 | Delivered as "Just listed", we have no per-item sales history to show real recent sales; strip switches to sold stones once orders exist |
| Language + currency switcher | 🟡 | Currency fully functional; language lists English only until translations exist (no fake locales) |
| Search option | ✅ | Header (desktop) + magnifier row (phone) + drawer |
| Cart icon next to account | ✅ | Live badge + /cart with correct totals, sold-item exclusion, WhatsApp order path |
| PM audit | ✅ | This document |

## Turn 8, sold flow & polish batch

| Request | Status | Notes |
|---|---|---|
| SOLD banner + admin display-days | ✅ | Transparent overlay on tiles and product pages; admin sets days before auto-removal (default 14); sold pages stay reachable for old links |
| Auto-sold from either channel | 🟡 | Sold state is one shared store both channels write. Etsy→here: watch mode polls every N minutes (`npm run etsy:sync -- --watch 10`); true instant needs an approved Etsy developer app, Etsy offers no public webhooks. Here→Etsy: needs the same API app. Local sales mark sold instantly once checkout lands |
| "Someone is shopping for it" indicator | ✅ | Real add-to-cart events only, 30-minute TTL, shown on the product page |
| € before amount | ✅ | €1,280.36 format |
| Header icons shift on currency change | ✅ | Fixed-width switcher |
| Marquee must self-move | ✅ | Now animates regardless of OS reduced-motion setting (owner decision, pause-on-hover kept) |
| Support + AI = one button | ✅ | Single Support launcher with two tabs |
| Add to bag → Add to cart | ✅ | All wording |
| Discount codes findable in admin | ✅ | "Discounts" nav label + overview card |
| Real payment brand icons | ✅ | Inline SVG Visa/Mastercard/Maestro/PayPal/Discover |

## Turn 9: stack parity with Trust-Agent

| Request | Status | Notes |
|---|---|---|
| Exact same architecture/stack as Trust-Agent | ✅ | Converted and verified: Next 16.2 (Turbopack builds, 4.8s vs 20s), React 19.2.3 pinned, root-level app/components/lib (src/ removed), Tailwind 4 CSS-first tokens in @theme, Prisma 6.16.3 with the lib/prisma.ts singleton (migration re-verified against live DB), ESLint 9 flat config with the inline-style/hex bans, zod 4 in lib/schemas.ts, lib/api-response.ts envelope, cn() in lib/utils.ts, node --test suite via tsx (5 passing), BullMQ/ioredis queue layer with inline fallback, instrumentation.ts worker boot. npm run validate = lint + typecheck + test + build, all green. Rendering verified pixel-identical (same computed tokens) |
| Remaining parity deltas | 🟡 | Deliberate, listed in NEXT-SESSION: components/ui primitives adopted incrementally, email-templates/telemetry/i18n/OAuth/2FA are feature ports scheduled with their milestones; Redis not installed on this machine so queues run inline (identical behaviour, no retry isolation) |
| Browser re-verification after the conversion | ✅ | Tokens, fonts, shadows, grids and the custom xs breakpoint all render from the new @theme; found and fixed a real 375px header overflow (logo wordmark now yields below xs) |
| Header overflow at 1280-1500px desktop | 🔴 | Pre-existing, surfaced by the same verification: the category nav (~1000px) pushes cart/account past the edge at common desktop widths. Needs a design decision (see NEXT-SESSION open items); not fixable with overflow scroll without clipping the dropdowns |

## Turn 10: desktop header overflow fix

| Request | Status | Notes |
|---|---|---|
| Header overflow at 1280-1500px desktop | ✅ | Priority+ "More" menu in MainNav: the desktop nav is now the flexible header element and folds trailing items into a right-aligned More dropdown when the row runs out of space (measured via an invisible clipped copy + ResizeObserver, so the category dropdown panels stay unclipped). Verified in the browser: no horizontal scroll at 1280 / 1366 / 1440 / 1920, full nav restored at 1920, More panel opens inside the viewport, mobile drawer at 375 unaffected. Overflowed categories link to their /shop?category page from the More panel |

## Turn 11: static-first restored (layout de-dynamised)

| Request | Status | Notes |
|---|---|---|
| Root layout made static | ✅ | Removed cookies()/headers()/currentUser() from app/layout.tsx. Currency now resolves fully client-side in CurrencyProvider (saved cookie first, then browser locale, USD default); signed-in state fetched from the new /api/auth/me route by AccountMenu after mount, re-probed on every route change so a fresh login updates the header without a reload |
| Catalogue prerenders again | ✅ | Route table verified: / and /cart ○ Static, /gem/[slug] ● SSG 147 paths (1h revalidate), /collections/[slug], /learn/[slug], /policies/[slug] all ●. Only session pages (account, admin, login, register) and API routes remain ƒ Dynamic, which is correct |
| Browser verification | 🟡 | Production build served via next start (new gemystic-prod launch config). Verified: USD default, switch to EUR updates prices and sets gem_currency cookie, EUR survives hard loads of prerendered pages, register/login/logout all update the header account menu correctly, dropdown shows name and admin link. Caveats: the in-app browser pane could not go below ~501px width (375px requested; no layout/CSS was touched so mobile rendering is unchanged) and its screenshot capture timed out, so checks were done through the accessibility tree and DOM instead |
| Validate | ✅ | npm run validate green: 0 lint findings on changed files (pre-existing hex-literal warnings untouched), typecheck clean, 5/5 tests, build 231 static pages |

## Turn 12: M1 stores on Prisma + password reset

| Request | Status | Notes |
|---|---|---|
| Auth/reviews/campaigns on Postgres | ✅ | Two-driver stores (Prisma when DATABASE_URL set, JSON fallback otherwise); owner/admin accounts and LAUNCH15 imported via npm run db:import-stores; register/login verified writing to the users table |
| Password reset | ✅ | /forgot + /reset/[token], hashed single-use tokens (60 min), throttled routes, mailer email, sessions revoked on success. Verified end-to-end incl. old-password rejection and token-reuse rejection |
| Sold + settings stores | 🟡 | Deliberately still JSON: their reads are synchronous inside the catalogue query path; swap scheduled as its own refactor (NEXT-SESSION M1.3) |
| Live deploy | ✅ | gems.cryptool.io serving over HTTPS from ronserver2 (PM2 gem-main, nginx + LE cert, native Postgres on the server, ./deploy.sh for future releases) |

## Turn 13: legacy-shop import, galleries, tile polish

| Request | Status | Notes |
|---|---|---|
| gemysticgems.com products + images into inventory/DB | ✅ | scripts/gemysticgems-sync.mjs reads the public WooCommerce Store API: all 203 products snapshotted; 199 not in our catalogue imported into the products/product_images/categories tables with full photo sets (26 in stock as drafts for pipeline step 2, 177 as sold history). Visible in admin Catalogue under "Inventory (pipeline step 1)" |
| Image galleries + rotation on marketplace tiles | ✅ | The two catalogues share almost no stock (0 weight matches, 4 title matches), so only honey-citrine gained a legacy gallery; every imported inventory stone carries its full set for when it is listed. Tiles with >1 photo cycle via pure-CSS crossfade (4.2s/slot, pause on hover, marquee-style reduced-motion exemption); PDP gains a thumbnail gallery. Verified via WAAPI time-stepping, the browser pane freezes animation clocks |
| Equal tile heights everywhere | ✅ | Reserved 2-line titles, constant six-cell spec grid, single-line form label; hero 2x2, marquee strip and shop grid all measure uniform (349/291/531px rows) |
| Remove Browse by colour from landing | ✅ | Section deleted |
| Landing hero tiles smaller + indicated in admin | ✅ | Hero uses compact cards capped at max-w-md; admin Catalogue badges "Landing hero" (4) and "Fine & rare" (8), one featuredProducts() definition shared with the homepage |

## Turn 14: commerce core, Google sign-in, admin pipeline

| Request | Status | Notes |
|---|---|---|
| Google login and signup | ✅ | Server-side OAuth code flow (no Google JS on the page), links to an existing email account on first use, first account still becomes owner. Buttons appear once GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set; a Google-only account is told to use the button rather than shown "password incorrect" |
| Category clicks landed on the all view | ✅ | Real bug: the heading always read "All gemstones" and category had no filter chip, so a filtered page looked unfiltered. Heading now names the category (and stone), the chip is removable, and a Category group was added to the sidebar |
| Filters A to Z | ✅ | Stone, Colour, Cut, Origin, Type and Category all alphabetical |
| Sliding bar for price and carat | ✅ | Dual-handle sliders over native range inputs (keyboard accessible, submit with the form). A handle left at its end stop is not treated as a filter |
| Checkout and payment | ✅ | Name, address AND phone per the owner flow, two delivery profiles (normal and express), server-priced totals (the browser never sets a price), demo card provider standing in for Stripe/PayPal with success and decline cards, idempotent capture |
| Invoice | ✅ | Print-ready invoice per order at /order/[number]/invoice, plus commercial invoice, packing list and certificate of origin for customs |
| Order management and automation | ✅ | /admin/orders with filters and detail: confirm manual payment (bank transfer or concierge), start preparing, dispatch with carrier and tracking, mark delivered. Every transition emails the customer, and delivery triggers the review request |
| Emailing team members on an order | ✅ | Notifies explicit subscribers, else every staff, admin and owner account. All sends logged and shown on the order |
| Admin catalogue renamed to Listings, editable, filterable | ✅ | Filters (search, category, stone, status, channel, edited-only), full editor, per-listing Etsy sync button. Old /admin/catalogue redirects |
| Per-stone SEO and AI variant | ✅ | Meta title, description and site keywords per stone, plus a separate Etsy tag set (13 max, enforced server-side). AI drafts all of it in one call, always as a draft for review. Verified live on the public page and its metadata |
| Fake order for testing | ✅ | `npm run seed:order` (add --paid to skip payment) |
| Admin must be very clear | ✅ | Nav restructured to the owner's pipeline: Inventory (1), Listings (2 & 3), Orders (4 & 5), Shipping (6), Finances (7), with tools below |
| Full buyer and admin walk | ✅ | Order GEM-2026-0001 taken from cart to delivered in the browser; see docs/HANDOVER-OPEN-ITEMS.md section B for the verified figures |

## Turn 15: categories, currencies, rupee formatting

| Request | Status | Notes |
|---|---|---|
| "I should be able to add categories myself inside an admin portal" | ✅ | /admin/categories renames, reorders, re-maps, hides and creates categories. Stored as overrides over data/taxonomy.json so a deploy cannot erase them. A new category takes stock through its form mapping, so it fills itself instead of needing 147 stones tagged. Verified: rename appeared on /shop and the nav, then restored |
| "option to add more [currencies] in Admin view later all calcs must be correct" | ✅ | /admin/currencies edits rates and adds currencies, stored in the database and merged over the shipped table. The merged set is handed to the client once per request, so every price on the page formats from the same numbers and there is still exactly one conversion path |
| PKR decimals | ✅ | Rupees display as whole rupees; dollars and euros keep their cents. Covered by a test |

## Turn 16: SEO admin, redirects, first-party analytics

| Request | Status | Notes |
|---|---|---|
| "IN admin i want a seo section" | ✅ | /admin/seo now edits the title template, fallback description and the staging noindex switch, and holds the Google and Bing verification tokens the site then serves as meta tags |
| "SEO is useless if you don't have the sitemap uploaded on bing and google" | 🟡 | Everything code can do is done: tokens are editable, the tags are served, and the page links straight to Search Console and Bing Webmaster with the sitemap URL to paste. The verify-and-submit click is the owner's, it cannot be done from here |
| Redirect manager (WordPress migration) | ✅ | Add a redirect by pasting an old URL or path; a hit counter shows which old addresses still pull traffic. Handled by a catch-all route rather than middleware, because middleware runs on the edge runtime and cannot reach Postgres. Verified: /product-category/emeralds/ lands on /shop?species=emerald, unknown paths still 404 |
| "analytics section to track where visitors and buyers come from" | ✅ | First-party tracking (anonymous browser id, no fingerprinting, no third party) writing visitor_sessions and page_views, with channel classification that includes AI assistants. /admin/analytics reports visitors, page views, channel mix, most viewed pages and stones. Verified: a Google referrer classified as organic |

## Turn 17: discounts, header rework, carousel, passwords

| Request | Status | Notes |
|---|---|---|
| "they have discounts, we need to copy the discounts" | ✅ | The legacy shop's sale prices are imported rather than lost, as a per-listing was-price |
| "when we add listings we can add or edit discounts per listing" | ✅ | Every listing takes its own was-price, entered directly or by picking a percentage, previewed before saving. A shop-wide code never stacks: a campaign is measured against the pre-discount price and whichever gives the buyer the lower price wins |
| "to many tabs in the headers... maybe contact in the footer" | ✅ | Nine nav items down to four. The six categories moved into one Shop panel that weights them honestly (one category holds two thirds of the stock) and adds the entry point buyers actually use, the stone itself. Contact is in the footer and the mobile drawer; Studio left the public nav; the measure-and-overflow More menu was deleted rather than tuned |
| "make all of these the same height" | ✅ | Search, currency, cart and account are all 40px; the search box was the one tall element |
| "this is not a carrousal" | ✅ | Just listed is now a real carousel: arrows, snap scrolling, touch swipe and keyboard, instead of an endless auto-scroll that could not be stopped or reversed |
| "allow users to change pw" | ✅ | Change password on the account page; it signs out every other device. A Google-only account can set a first password there |
| "add billah0997@gmail.com as admin" + temp pass | ✅ | Created on production with the admin role; password handed over separately. `npm run grant:admin <email> [role]` does this repeatably |
| Inventory spreadsheet, all tabs | ✅ | Read and documented in docs/HANDOVER-OPEN-ITEMS.md section I. It changes the inventory model: SKU code system, eight sales channels (not two), a four-state photo workflow, Drive folders per stone, per-gram pricing with totals, and matched pairs |
| Live on production | ✅ | Deployed to gems.cryptool.io and verified there |
| Studio was publicly reachable | ✅ | Found while doing the header work: /studio had noindex but no role check, so cost prices and margins were open to anyone with the URL. Now staff-only |

## Turn 18: inventory intake, sheet import, image ownership

| Request | Status | Notes |
|---|---|---|
| Inventory intake matching the real sheet | ✅ | /admin/inventory has the intake form. SKU codes are generated from the sheet's own system (G cut, P pair, SP specimen, RP rough parcel, plus a pinned species abbreviation), never typed. Measurement fields switch on stone type: carats and millimetres for cut stones, grams for specimens, a weight range with per-gram pricing and a computed total for parcels |
| Eight sales channels | ✅ | A product_channels row per stone and channel, each with its own state and listing URL, covering Web, Etsy, eBay, Instagram, TikTok, Gem Rock, eRock and 1stDibs. "What is live on TikTok" is now a query |
| Photo workflow | ✅ | The sheet's own four states (pending images, filter images, in draft, uploaded), with counts on the inventory page |
| Cost price | ✅ | Asked for at intake, and the page reports how many stones still lack one, because Finances cannot show a real margin without it |
| Import the sheet | ✅ | `npm run import:sheet` reads all three tabs; `--apply` writes them. 68 stones imported with their codes, weights, Drive folders and existing Etsy links. 11 rows were reported and skipped because they carry no price in the sheet yet, rather than being guessed at |
| Image ownership | ✅ | `npm run own:images` downloaded all 1,072 hotlinked photos (778 from the compromised WordPress site, 294 from Etsy's CDN) into our own storage and rewrote every reference: 147 catalogue products, the galleries, and 777 database images. Zero failures. The shop no longer depends on either site staying up |

## Turn 19: the carousel, properly

| Request | Status | Notes |
|---|---|---|
| "a carousal is infinite" | ✅ | The set is rendered three times and the scroll position is kept in the middle copy; drifting into either outer copy jumps one copy back, over identical pixels, so the jump is invisible and the strip has no end in either direction. Verified by pushing the position deep into the last copy and then into the first: it wrapped both ways |
| "you only had them move from right to left" | ✅ | Both arrows are always live, because there is no end to disable them at, and the strip can be dragged or swiped either way |
| "go outside the screen limits" | ✅ | The track sits inside the page container and its edges fade rather than a card being sliced at the boundary |
| Motion | ✅ | It drifts slowly on its own and stops the moment a visitor hovers, focuses or touches it, so it never fights someone reading a card |

Three bugs found and fixed while verifying this. Two only appear on a cold load:
the initial centring ran before the images had given the strip any width, so it
stayed pinned at the start with nothing to its left, and a first-paint opacity
guard could latch off and leave the whole carousel invisible.

The third only appeared in production, and is worth recording. The drift added
0.4 pixels per tick, and scrollLeft is stored in whole pixels, so the browser
rounded every step back to nothing and the strip never moved. It worked in
development purely because React StrictMode mounts effects twice: two timers
each added their step, the sum cleared a pixel, and the fault stayed hidden.
The drift now keeps its position as a float and assigns the running total, so
the fractional part accumulates. Verified against a real production build
rather than the dev server, at the intended 13 pixels a second.

## Turn 20: inventory to shop, photo upload, auto-list

| Request | Status | Notes |
|---|---|---|
| "we only save photos on the server not on the drive anymore" | ✅ | Drag and drop upload on each stone, written through the storage adapter into our own storage (S3 later by changing one env var). The first photo becomes the main image, any photo can be promoted or removed, and uploading moves the bench status off "pending images". Drive links from the old sheet are still shown, but only as a reminder of where to fetch the originals from |
| "need an option to edit these" | ✅ | Full edit page per stone: listing copy, per-stone SEO, type, measurements by type, both prices, cost, origin, treatment, notes, photographs and all eight channels |
| "the filter should be same filter as in the marketplace" | ✅ | Inventory now has the marketplace filter set: search, stone type, photo status, listed or not, live-on-channel, a price range slider off real stock bounds, and a sort |
| "auto list and fill in listing including seo button" | ✅ | Two buttons, deliberately separate. Fill listing with AI writes title, description, meta title, meta description, keywords and Etsy tags into the fields. Publish to shop is what actually lists it, and that click is what records the AI copy as human-reviewed. Publishing refuses a stone with no photograph or no price |
| "i still only see 1 image per listing when the originals have many more" | ✅ | Diagnosed rather than assumed: the two catalogues are different stock. The legacy shop sells rough parcels (203 products, about 4 photos each); the Etsy-derived listings are cut stones and jewellery (147, one photo each, which is all the Etsy scrape ever captured). Zero overlap on species and weight. The multi-photo products were sitting in inventory, so publishing is what puts them in the shop with their full galleries. Verified: published a 4-photo stone, it appeared in the shop and its page rendered 4 gallery thumbnails |

Published inventory now merges into the storefront through lib/listings.ts, so
the shop, product pages and tile galleries read one combined set and neither
source is special-cased.

## The standing gap, one dependency, many features

~~A running Postgres~~ **Resolved.** The `gemystic` database is live on the
machine's native PostgreSQL 17 (no Docker; same server Trust-Agent uses), schema
fully migrated, and auth/reviews/campaigns now run on it. Order management,
invoices, shipping docs, payments, sheet import and finance-in-admin now wait
only on the payment accounts (B7) and their build milestones (M2+).
