# Request tracker — full session audit

You asked whether anything you requested was missed. Fair challenge — this is the
complete audit of every request across the whole engagement, honestly graded.
Maintained from now on; last updated 18 July 2026.

**Legend:** ✅ delivered & verified · 🟡 partially delivered (gap stated) ·
🔴 designed but not operational · ⏳ blocked on something outside the code

## Turn 1 — initial build

| Request | Status | Notes |
|---|---|---|
| Marketplace with all stones from the Etsy shop | ✅ | 147 listings scraped, parsed, live |
| SEO focus | ✅ | schema.org everywhere, sitemap, unique metas |
| "AI variant" (AEO) | ✅ | llms.txt, /api/catalog, AI-crawler robots policy |
| AI support (assistant) | 🟡 | Built; never executed — no provider key configured. Provider chain now supports free models + Bedrock |
| Auto-listing tools | 🟡 | AI auto-list from photo/notes built (same key caveat). Google-Sheet auto-import: schema designed, importer not built |
| AI financial integration | 🟡 | Finance engine + analyst built; analyst needs a provider key |

## Turn 2 — reference site

| Request | Status | Notes |
|---|---|---|
| Use gemysticgems.com as reference | ✅ | Brand, USD, policies, taxonomy mirrored; compromise found and documented (local file, kept out of public repo) |

## Turn 3 — theme & architecture

| Request | Status | Notes |
|---|---|---|
| Own theme: emerald on light | ✅ | Semantic token system |
| Local-first, AWS (SES) later, backups | ✅ | Driver architecture; backup verified by restore round-trip |
| Works on any device, ultrawide to phone | ✅ | Verified 320→3440px |

## Turn 4 — platform requirements

| Request | Status | Notes |
|---|---|---|
| PostgreSQL | 🟡 | Required per you: SQL DDL + Prisma schema validated, client generated, compose service, migrate scripts. **Not executed — Docker isn't running on this machine.** JSON stores drive runtime until then |
| Auto-listing from Google Sheet | 🔴 | import_runs/import_rows designed (SQL + Prisma); importer service not built — sequenced after DB is live |
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

## Turn 5 — UI & platform batch

| Request | Status | Notes |
|---|---|---|
| Push to github.com/cryptool-io/gemystic | ✅ | Pushed once token fixed |
| Sample photos on species tiles | ✅ | Rule-based best-photo selection |
| **Clear support icon** | ✅ *(second attempt)* | **First attempt missed the mark — bare chat bubble, still ambiguous. Now a labelled "Support" pill with headset icon.** The miss that triggered this tracker |
| Signup/login | ✅ | Working, verified end-to-end |
| Add admins / admin view | ✅ | Team page, roles, first-account-owner rule |
| Reviews section | ✅ | Product+shop reviews, moderation, real Etsy seed |
| Logo | ✅ | Emerald-cut SVG mark |
| Unique animations / market research | ✅ | Research doc → scroll reveals, sheen, marquee |
| Phone menu broken | ✅ | Real bug (backdrop-filter containing block), fixed + verified |

## Turn 6 — refinement batch

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

## Turn 7 — this batch

| Request | Status | Notes |
|---|---|---|
| Hero intro + changing count | ✅ | Rewritten; counters replaced with standing promises |
| Cool professional animation | ✅ | "Just listed" film-strip marquee (pause-on-hover, reduced-motion safe) |
| Prices by IP origin, USD/EUR, extensible, correct calcs | ✅ | Geo-header + Accept-Language detection, cookie override, one conversion path, rates file ready for admin UI |
| Free models + Bedrock backup | ✅ | Provider chain (openai-compatible / bedrock / anthropic) wired into all three AI routes — runtime execution still needs credentials on the box |
| Google Analytics linked to results | ✅ | GA4 + commerce events; set NEXT_PUBLIC_GA_ID |
| Discount campaigns by stone type | ✅ | Admin CRUD, live/paused/scheduled, non-stacking correct math, storefront strikethrough |
| Support icon redo | ✅ | See turn 5 row |
| Filters as popup | ✅ | Slide-over over the results |
| Raw vs Rough: same category | ✅ | Merged into "Rough & Raw Gemstones" |
| Push (token fixed) | ✅ | On main |
| "Recent sales" strip on landing | 🟡 | Delivered as "Just listed" — we have no per-item sales history to show real recent sales; strip switches to sold stones once orders exist |
| Language + currency switcher | 🟡 | Currency fully functional; language lists English only until translations exist (no fake locales) |
| Search option | ✅ | Header (desktop) + magnifier row (phone) + drawer |
| Cart icon next to account | ✅ | Live badge + /cart with correct totals, sold-item exclusion, WhatsApp order path |
| PM audit | ✅ | This document |

## Turn 8 — sold flow & polish batch

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

## The standing gap — one dependency, many features

Order management, invoices, shipping docs, payments, sheet import and finance-in-admin
all wait on the same thing: **a running Postgres.** Everything is designed and much is
coded against it. Unblock: start Docker Desktop →
`docker compose --profile db up -d` → `npm run db:migrate`.

## Turn 10: static-first restored (layout de-dynamised)

| Request | Status | Notes |
|---|---|---|
| Root layout made static | ✅ | Removed cookies()/headers()/currentUser() from app/layout.tsx. Currency now resolves fully client-side in CurrencyProvider (saved cookie first, then browser locale, USD default); signed-in state fetched from the new /api/auth/me route by AccountMenu after mount, re-probed on every route change so a fresh login updates the header without a reload |
| Catalogue prerenders again | ✅ | Route table verified: / and /cart ○ Static, /gem/[slug] ● SSG 147 paths (1h revalidate), /collections/[slug], /learn/[slug], /policies/[slug] all ●. Only session pages (account, admin, login, register) and API routes remain ƒ Dynamic, which is correct |
| Browser verification | 🟡 | Production build served via next start (new gemystic-prod launch config). Verified: USD default, switch to EUR updates prices and sets gem_currency cookie, EUR survives hard loads of prerendered pages, register/login/logout all update the header account menu correctly, dropdown shows name and admin link. Caveats: the in-app browser pane could not go below ~501px width (375px requested; no layout/CSS was touched so mobile rendering is unchanged) and its screenshot capture timed out, so checks were done through the accessibility tree and DOM instead |
| Validate | ✅ | npm run validate green: 0 lint findings on changed files (pre-existing hex-literal warnings untouched), typecheck clean, 5/5 tests, build 231 static pages |
