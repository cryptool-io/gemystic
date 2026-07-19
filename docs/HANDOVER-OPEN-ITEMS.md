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

## B. The commerce core: BUILT 19 July 2026

Status changed. Everything in this section now exists and was walked end to end
in the browser (order placed, paid, prepared, shipped with documents, delivered,
review requested). Payment runs on a demo provider until the owner opens Stripe
and PayPal; swapping it is one function body in lib/payments.ts, because the
order, payment row, stock, invoice and email side effects all sit behind it.

Verified on 19 July 2026 with order GEM-2026-0001:
subtotal 398.50 + 25.00 shipping = 423.50 charged; both stones marked sold in
the shared sold store; confirmation to the buyer and notices to two team
members in var/outbox; status advanced through the full pipeline with one
email per transition; three export documents generated; review request sent on
delivery. Declined-card and double-payment (idempotency) paths both tested.

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

## C. Admin self-service: partly built 19 July 2026

C2 (listing management) and C3 (per-stone SEO) are done: /admin/listings
replaces the read-only catalogue with filters (search, category, stone, status,
channel, edited-only), a per-listing editor covering title, description, price,
treatment, meta title, meta description, site keywords and the separate Etsy
tag set, an AI draft button, and a per-listing Etsy sync. Edits are stored as
overrides layered over the generated catalogue, so `npm run normalize` no
longer erases them, and they appear on the storefront immediately.

C1 (categories) is done too: /admin/categories can rename, reorder, re-map,
hide and create categories, stored as overrides over data/taxonomy.json. A new
category takes stock through its form mapping rather than per-stone tagging, so
it fills itself. Verified: a rename appeared on /shop and the nav, then
restored.

C5 (currencies) is done: /admin/currencies edits rates and adds currencies,
stored in the database and merged over the shipped table, handed to the client
once per request so every price formats from the same set. Rupees now display
as whole rupees (no paisa), covered by a test.

C3 (SEO) and C4 (analytics) are done as well: /admin/seo edits global SEO,
holds the Google and Bing verification tokens (which the site then serves as
meta tags) and manages the redirect map for the WordPress migration;
/admin/analytics reports first-party traffic, channel mix including AI
assistants, and the most viewed pages and stones.

Section C is therefore complete. What remains of the original list is the
owner-blocked items in section D and the SEO gap pages in section E.

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
> Owner: "Pick a logo for now also". Billah: "Gemystic Gems, 10 Logo
> Concepts.html, this doesnt work"

The concepts file Billah received does not open. Re-export the 10 concepts as
a single PNG/PDF sheet (no HTML), get a pick, apply it (components/Logo.tsx is
the one-block swap point).

## H. The admin pipeline (owner spec, 18 July 2026), THE build order for M2-M6

The owner defined the admin flow step by step. This supersedes scattered
requirements above where they overlap; every admin screen must make its place
in this pipeline obvious ("admin section needs to be very clear").

> Step 1 inventory + determining and adding measurements, color, sizes,
> pricing, etc. (everything)
> Step 2 is selecting what stone is going to be listed where Etsy plus our own
> platform
> Step 3 is content per listing (AI automated) based on info from inventory
> Step 4a invoice and order receiving goes to clients automatically
> Step 4 bis once sold to sync Etsy and platform and inventory is updated
> Step 5 is to trigger admin of an order and create the invoices, documents,
> check taxes, create transport order (to be determined where this is done)
> Step 6 once package is gone information is entered and shared with client
> automatically
> Step 7 finances are updated

Refinements agreed by analysis (each is an addition, not a change of intent):

1. **Step 1 additions**: photos (and later video) at intake; COST price beside
   selling price (step 7 margins are impossible without it, B8); stock
   location PK|TH (drives step 5 export docs); certification details.
   Inventory item states: in_stock → listed → reserved → sold → shipped →
   delivered (reserved = a paying checkout in progress; one-of-a-kind stones
   must not oversell during a payment race).
2. **Step 2**: platform listing free/default, Etsy opt-in per stone (costs
   money, G3), channel badges visible in the inventory list.
3. **Step 3**: AI drafts fill BOTH tag sets (site SEO + Etsy's own taxonomy);
   nothing publishes without human review (ai_reviewed_at gate already in the
   schema).
4. **Between order and step 4a there is an explicit PAYMENT step**: Stripe /
   PayPal automatic, plus a manual "payment confirmed" action for bank-transfer
   and WhatsApp concierge deals (G4). Invoice + confirmation email go out on
   payment confirmation, automatically.
5. **Step 4bis**: platform sale marks sold instantly; Etsy directions run on
   the watch-mode poll until the Etsy developer app (B/D) unlocks true sync.
6. **Step 5**: internal fulfilment pack: commercial invoice, packing list,
   certificate of origin (HS 7103 default), tax/declared-value check (policy:
   never under-declare); transport order booking stays a documented manual
   step until a carrier is chosen ("to be determined" per owner).
7. **Step 6**: entering carrier + tracking dispatches the customer email
   automatically and flips status shipped.
8. **Step 8 (missing from the owner list, from their own WhatsApp flow)**:
   delivered → automatic review-request email after N days (ties into
   CONVERSION-REVIEW acquisition flow). Also the returns/refunds lane: the
   site promises 14-day returns, so the pipeline needs a return intake +
   refund record (payments/refunds tables already exist).
9. **Step 7**: finances update from real order rows (revenue, fees by channel
   from lib/finance.ts model, margin from intake cost price).

**Admin nav mirrors the pipeline**: Inventory → Listings → Orders →
Shipping → Finances (+ the existing Reviews/Discounts/Team/SEO/Settings).
Each screen states which step it is.

## I. The owner's real inventory sheet (read 19 July 2026)

The owner shared the working inventory spreadsheet. It has three tabs, and it
changes what the inventory module has to hold. Everything below is from the
sheet itself, not assumed.

**Tab 1, cut stones (73 rows).** Columns: #, Gemstone name, O, Pair, Colour,
Code, Price in USD, Status, Dimensions (length, width, thickness, diameter in
mm), Weight in carats, Comments, Shape, Media.
Species present: Amethyst, Amethyst (Prasiolite), Ametrine, Aquamarine,
Citrine, Emerald, Morganite, Peridot, Rhodolite Garnet, Topaz, Tourmaline.

**Tab 2, specimens (3 rows)** and **Tab 3, rough and parcels (9 rows).**
Same idea, different measurements: price per unit AND a total, weight in grams
as a range (from, to) plus an overall weight, and for rough an extra radius
column. Tab 3 also carries live Etsy listing URLs.

What this tells us that the current build does not model:

1. **SKU codes are a real system**: GAMT001, PAMT001, SPEMD001, RPAMT001. The
   prefix encodes the type (G cut, P pair, SP specimen, RP rough parcel), then
   a species abbreviation, then a sequence. Intake should generate these, not
   ask for them.
2. **Eight sales channels, not two.** The sheet has a "Listed" block with
   columns for Web, Etsy, Ebay, IG, TikTok, Gemrock, Erock and 1stDibs. The
   listing editor currently models site plus Etsy only. Channel presence per
   stone belongs on the inventory item.
3. **Status is a workflow**, not a flag: Uploaded, In Draft, Filter Images,
   Pending Images. These describe how far the photography and listing prep has
   got. Intake should use these words, they are already the team's vocabulary.
4. **Photos live in Google Drive**, one folder per stone (71 of 73 cut stones
   have a folder). The image-ownership job should pull from those folders, not
   only from the web shops.
5. **Parcels price per gram with a total**, so the inventory item needs unit
   price, unit of measure and computed total, not a single price field.
6. **Pairs matter** (the "Pair" column on tab 1): matched stones sold together
   are a distinct thing from a single stone.

None of this is built yet. It is the specification for the intake form in
pipeline step 1, and it should be built before any bulk import, because
importing into the wrong shape twice costs more than modelling it once.

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
