# Handover: every owner comment not yet implemented

Written after a line-by-line re-audit of all nine owner messages in this session,
verified against the CODE (grep and route checks), not against my own earlier
tracker. The owner was right to push: several important comments are not
implemented. This file is the definitive open list for the next session, with the
owner's words quoted verbatim so nothing gets reinterpreted.

Audit date: 18 July 2026. Method and evidence per item below.
Companion files: docs/NEXT-SESSION.md (milestone detail), docs/REQUEST-TRACKER.md.

---

## A. Found and fixed during this audit

| Claim vs code | Result |
|---|---|
| "Add to bag = add to cart" rename | One remnant string in components/account/SavedStones.tsx. Fixed now |
| Sold overlay, display-days setting, interest badge, marquee self-scroll, merged HelpHub button | All re-verified present in code (my audit greps were initially wrong, the features are real: ProductCard sold overlay, lib/sold.ts + soldDisplayDays 0-90 in lib/settings.ts, components/InterestBadge.tsx + app/api/interest, `*:not(.marquee-track)` motion exemption, single HelpHub in layout) |

## B. NOT implemented: the commerce core

These are the owner's biggest asks. All were dependency-blocked on the database,
which is NOW LIVE, so nothing blocks them anymore except Stripe/PayPal keys.

### B1. Orders
> "managing orders" ... "as admin we want the entire process from order to delivery automated"

Evidence: app/admin/orders/page.tsx renders the Pending placeholder component.
No order can be created, viewed or advanced. Build: NEXT-SESSION M2 step 7
(order list, status pipeline pending>paid>processing>shipped>delivered, emails on
each transition).

### B2. Payments
> "payment is paypal, stripe credit/debit card" ... "managing payments"

Evidence: `grep -rli stripe|paypal` across app/ and lib/ matches only prose
(help page copy, PDP guarantee text, the fee model in lib/finance.ts). Zero SDK
code, zero webhook routes, zero keys. Build: M2 steps 3-4 (Stripe
PaymentIntent + signed webhook first, PayPal capture second, idempotent
payments rows). Owner must supply accounts (see D).

### B3. Checkout and invoices
> "go through the entire platform as a new buyer, sign up log in buy etc. receiving invoice"

Evidence: sign up / log in work (verified earlier end-to-end). Buy does not
exist: /cart ends at WhatsApp concierge. Invoice: grep matches only promise
copy on account pages, no generation code. Build: M2 steps 2 and 6 (checkout
page, PDF invoice GEM-YYYY-NNNN, downloadable in /account/orders and admin).

### B4. Shipping runtime and export documents
> "managing shipping and preparing all transports and docs from pakistan and thailand to global"
> "receiving shipping information (via platform and email)"

Evidence: shipments and shipment_documents tables exist in the live DB, no UI,
no document generation, no shipping emails. Build: M3 (admin shipment create,
commercial invoice + packing list PDFs with HS 7103, certificate of origin,
tracking email on dispatch).

### B5. Team notifications on orders
> "emailing team members in case of an order or other important things"

Evidence: mailer works (file/SMTP/SES drivers, review notices send). There are
no order events to hook. notification_subscriptions table is live and empty,
no admin UI for it. Build: inside M2 step 5 plus a small admin toggle page.

### B6. Google Sheet auto-listing
> "(auto) listing, auto is from a google sheet input"

Evidence: `grep -rli googleapis|spreadsheet` across app/, lib/, scripts/
returns nothing. import_runs / import_rows tables are live and empty. Build:
M4 (service account, header-row contract validated with zod, upsert by
source_ref, admin trigger + per-row error history). Owner must share the sheet
and a service-account credential.

## C. NOT implemented: admin self-service

### C1. Category management
> "I should be able to add categories myself inside an admin portal"

Evidence: app/admin/categories is a read-only viewer; no create/edit/reorder
form posts anywhere. Categories still edit via data/taxonomy.json. The DB
table is live and matches the file shape. Build: M6.1 (move taxonomy into the
categories table, CRUD UI, nav reads DB).

### C2. Listing upload
> "and upload listings set to a category"

Evidence: no product-create UI, no image upload pipeline (products come only
from the Etsy normalize script; images hotlink i.etsystatic.com). Build: M6.2
plus the image-ownership migration in M6.3. The AI auto-lister exists but
outputs drafts to screen, not into the catalogue.

### C3. Editable SEO section
> "IN admin i want a seo section"

Evidence: /admin/seo is a status display; seo_settings and redirects tables are
live and empty; nothing writes them. Build: M6.4 (global meta editor, redirect
manager wired into middleware, which also carries the WordPress 301 map).

### C4. Analytics section
> "and analytics section to track where visitors and buyers come from"

Evidence: /admin/analytics renders the Pending placeholder. GA4 events are
wired in code but dormant because NEXT_PUBLIC_GA_ID is unset (owner, see D).
First-party tables (visitor_sessions, page_views, order_attribution) are live
and empty; no tracker middleware writes them. Build: M5. "Where BUYERS come
from" additionally needs checkout (M2) for the purchase event.

### C5. Currency admin
> "have the option to add more [currencies] in Admin view later all calcs must be correct"

Evidence: calcs are correct and tested; adding a currency is still a
data/currencies.json edit, no admin editor. Build: M6.5 (rates editor writing
the settings table; FX refresh cadence decision is the owner's, see D).

## D. Blocked on the owner (code cannot proceed)

| Owner comment | What is needed |
|---|---|
| "we are going to run this via e free models and AWS bedrock as backup" | Provider chain is built and routed, but NO AI feature has ever executed: zero credentials. Set AI_OPENAI_BASE_URL/MODEL/API_KEY (Groq or OpenRouter free tier) and/or BEDROCK_MODEL_ID + AWS credentials in .env.local. First session after that must smoke-test assistant, auto-lister, finance analyst |
| "add google analytics also and make sure results are linked" | Code wired (page_view, search, view_item, add_to_cart). Dormant until NEXT_PUBLIC_GA_ID is set. purchase event lands with M2 |
| "etsy sync needs to be done instantly" | Watch mode polls every 2-10 min (`npm run etsy:sync -- --watch 10`). True instant requires an approved Etsy developer app (apply at etsy.com/developers): Etsy has no public webhooks. Here-side sales become instant automatically in M2 |
| Stripe + PayPal | Open both accounts, provide API keys (M2 prerequisite) |
| Hosting + domain | Choose host, set NEXT_PUBLIC_SITE_URL; clean the hacked WordPress site first (local SECURITY file) |
| Thailand stock | "indicate where it will be shipped from ... thailand": display is built, but every product defaults PK; owner must tag TH items |
| Real stone costs | Finance margins assume 42% until real costs entered |
| Font | Sora is candidate three; approve or name a replacement (one-block swap) |
| LAUNCH15 | Demo promo code in local runtime state; keep or delete |
| Stone videos | Conversion review's top trust fix; only the owner can shoot them |

## E. Partial deliveries to finish

| Owner comment | Gap | Where |
|---|---|---|
| "make that happen" (SEO nr 1 plan) | Strategy doc done; ZERO of the gap pages built (verified: no swat hub, no price guides, no comparison pages) | M7, page list in docs/SEO-STRATEGY.md |
| "language and currency add an option as well to change it" | Currency fully working; language switcher lists English only, no i18n layer | Port Trust-Agent lib/i18n pattern; start with the locales the buyers actually use (EN, DE?) |
| "Our Recent Gemstone Sales" carousel | Delivered as "Just listed" because zero sales history exists; flip the strip to genuinely sold stones once M2 produces orders | ShowcaseMarquee.tsx reads justListed(); switch source to sold |
| Etsy field parity | Schema has 10-image galleries; only the primary image was ever scraped | Browser-collect remaining images or wait for M6 uploads |
| Trust-Agent parity (stack DONE this session) | Feature ports remain: email-templates set, telemetry, OAuth + 2FA, components/ui adoption, api/v1 versioning, Redis install for real queues | Scheduled inside M2/M5/M8 |
| Small polish | PKR shows decimals (should be whole rupees); cart promo scope matches species but not categories; Studio link visible to public nav; images still hotlink Etsy CDN | 30-60 min batch, do alongside M2 |

## G. Owner-Billah WhatsApp flow (added 18 July 2026, verbatim requirements)

The owner shared the WhatsApp thread with Billah describing the real business
flow. New requirements not captured anywhere else; quoted so nothing gets
reinterpreted.

### G1. Delivery profiles: Normal and Express shipping
> "We provide 2 type of shipping. Normal and Express. We set delivery profile
> for each gemstone we upload."

Not modelled anywhere: products have no shipping/delivery profile, checkout
design (M2) assumed one method. Build: delivery_profiles (name, carrier hints,
normal/express rates and day-ranges), per-product profile assignment, shipping
choice at checkout, shown on PDP.

### G2. Inventory-first admin (replaces the spreadsheet)
> Billah: "We have the gemstones at the office and we upload them" (inventory =
> a spreadsheet). Owner: "You keep it on the site so it's all connected and you
> only have to do it once" and later: "for admin we have inventory management,
> we can list stones from that list or when items are added to that list
> directly, have an AI option to generate content and make sure all marketplace
> and etsy listing categories are entered correctly"

This reframes C2 (listing upload) and M4 (sheet import): inventory is the
primary entity (stone in the office: weight, dimensions, colour, cost, photos),
listing is an action ON an inventory item. AI content generation is an option in
that flow and must fill both the marketplace categories and, when Etsy listing
is enabled, Etsy's category/tag taxonomy correctly. The M4 Google-Sheet import
becomes the one-time migration INTO inventory plus an ongoing import channel.

### G3. Etsy cross-listing: optional, never default
> Billah: "keep it separate", "listing on ETSY costs money", "ETSY listing has
> different type of Tags SEO based". Owner: "i will make an option not default
> and to be done later phase to list it also on Etsy. So it does that
> automatically"

When listing from inventory, an opt-in "also list on Etsy" toggle (later phase,
needs the Etsy developer app, see D). Etsy tags are their own field set, not a
copy of site SEO tags. Default is OFF because each Etsy listing costs money.

### G4. Order flow contract (the acceptance script for M2/M3)
> "the customer orders the gemstone and gives us address, name and phone number.
> Once we confirm payment is received we ship the gemstone and mark the order as
> delivered. Once the customer gets the order, they leave a review"

Checkout must capture name, address AND phone. Status pipeline needs the
manual "payment confirmed" step to also work concierge-style (bank transfer /
WhatsApp deals), not only via Stripe webhooks. Post-delivery review ask closes
the loop (ties into the review-acquisition flow in docs/CONVERSION-REVIEW.md).

### G5. Sitemap submission
> Owner: "SEO is useless if you don't have the sitemap uploaded on bing and
> google"

Sitemap.xml exists; nobody has submitted it. Needs: Google Search Console +
Bing Webmaster verification for gems.cryptool.io now and the final domain later,
sitemap submitted, IndexNow wired (M7 already lists it). Owner action: grant
access to (or create) the Search Console / Bing accounts.

### G6. Logo decision
> Owner: "Pick a logo for now also". Billah: "Gemystic Gems — 10 Logo
> Concepts.html — this doesnt work"

The concepts file Billah received does not open. Re-export the 10 concepts as
a single PNG/PDF sheet (no HTML), get a pick, apply it (components/Logo.tsx is
the one-block swap point).

## F. How the next session starts

1. Read this file, then docs/NEXT-SESSION.md sections 1 and 4.
2. Confirm nothing regressed: `npm run validate` (lint + typecheck + test + build).
3. If owner supplied Stripe/PayPal keys: begin M2 (checkout). That single
   milestone closes B1, B2, B3, most of B5, and turns on order-related emails.
4. If not: M1 is now largely done (auth/reviews/campaigns on Prisma, password
   reset live; sold/settings deliberately still JSON, see NEXT-SESSION M1.3).
   Next key-free work: M6.1 category CRUD and the G2 inventory module.
5. Update docs/REQUEST-TRACKER.md and this file as items close. Never mark an
   item done without a code-level or browser-level verification, that is what
   this audit existed to correct.
