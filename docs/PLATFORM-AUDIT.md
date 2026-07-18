# Platform audit — 18 July 2026

Direct answers to what you asked, then the gap list.

---

## 1. "Is the database in PostgreSQL?"

**No. There is currently no database at all.**

The catalogue is a flat JSON file (`data/catalog.json`) generated at build time and
read-only at runtime. That was the right call for a read-only shop window — 147
static product pages, no accounts, nothing to write. It is the **wrong** call for
everything you just described, because orders, users, payments and admin-managed
categories all require writes, transactions and history.

### Recommendation: Postgres + Prisma

Not just "Postgres" — specifically **Postgres with Prisma**, because your own
Trust-Agent codebase already runs that stack (`prisma/schema.prisma`, ~130 models,
28 migrations, `lib/prisma.ts` singleton). Same mental model, same migration
workflow, same review habits across both projects. Choosing a different ORM here
would cost you nothing technically and a great deal in context-switching.

Postgres also fits the local-first architecture already in place: it runs in a
container next to the app today, and moves to RDS by changing a connection string.

**Status: schema written, not executed.** `db/migrations/001_init.sql` is a complete
DDL for the platform you described — 24 tables covering identity, taxonomy, Etsy-parity
products, orders, payments, shipping, export documents, email log, sheet imports,
audit trail, and first-party analytics. It has **not been run**: there is no Docker
or Postgres on this machine, so I could not apply it or verify it against a live
server. Treat it as a reviewed design, not a tested migration.

---

## 2. "Go through the platform as a new buyer — sign up, log in, buy, get an invoice"

**I could not, because none of that exists.** This is the most important finding in
this document, so it should not be buried: what is built is a catalogue and an
admin analytics surface, not a shop that can take money.

| Step in the journey | Status |
|---|---|
| Browse catalogue | ✅ works — 147 products, search, filters, categories |
| View product detail | ✅ works |
| Create an account | ❌ **does not exist** — no signup route, no users table |
| Log in / log out | ❌ **does not exist** — no auth, no sessions |
| Add to cart | ⚠️ writes to `localStorage` only — no cart page, no server state |
| View cart | ❌ **does not exist** |
| Checkout | ❌ **does not exist** |
| Pay (Stripe / PayPal) | ❌ **does not exist** — no SDK, no keys, no webhooks |
| Order confirmation | ❌ **does not exist** |
| Invoice | ❌ **does not exist** |
| Shipping notification | ❌ **does not exist** |
| Track an order | ❌ **does not exist** |
| Order history | ❌ **does not exist** |

The only working transactional path on the site is the **contact form**, which
writes an `.eml` to `var/outbox` because no mail relay is configured yet.

To be explicit about earlier work: the README has always described checkout as a
stub. But "stub" undersells it — there is no checkout, cart page, or order concept
of any kind, and the buyer journey you asked me to walk does not begin.

---

## 3. Admin requirements versus what exists

| Requirement | Status |
|---|---|
| Auto-listing from Google Sheet | ❌ not built. `import_runs` / `import_rows` tables designed; no Sheets client, no field mapping, no scheduler |
| AI-assisted listing | ✅ built (`/studio/listings`) — notes/photo → title, description, tags, price. Never executed: no API key |
| Admin-managed categories | ⚠️ **half done this session.** Taxonomy is now data (`data/taxonomy.json`) driving nav, shop filters and normaliser. **No admin UI to edit it yet** — still a file edit |
| Upload listings into a category | ❌ no upload UI, no image pipeline, no draft/publish flow |
| Order management | ❌ not built |
| Email team on orders | ⚠️ mailer abstraction exists (file/SMTP/SES) and works; no order events to trigger it, no templates, no `notification_subscriptions` UI |
| Shipping + export docs (PK & TH) | ❌ not built. `shipments` / `shipment_documents` tables designed, including commercial invoice, packing list, certificate of origin, export permit |
| Payments (Stripe, PayPal) | ❌ not built |
| SEO section | ⚠️ SEO is strong on the storefront (JSON-LD, sitemap, meta, llms.txt) but there is **no admin section to edit it** |
| Analytics / attribution | ❌ not built. `visitor_sessions`, `page_views`, `order_attribution` designed to answer "where do buyers, not just visitors, come from" |

---

## 4. Etsy listing-field parity

Etsy fields now modelled in the schema that the current JSON catalogue lacks:

**Had already:** title, description, price, quantity, tags, materials, images,
category, weight, dimensions.

**Added to the schema:** `compare_at_price` (sale "was" pricing — your live site uses
it), `sku`, `section` (shop section), `who_made` / `when_made` / `is_supply` (Etsy's
three mandatory qualifiers), `listing_type` physical vs digital, `auto_renew`,
personalisation (enabled / prompt / required / max length), product variants with
per-variant price and quantity, up to 10 ordered images with `alt` text and a single
enforced primary, video, processing time min/max, `hs_code` for customs, and
`ships_from` (PK or TH).

**Gemstone-specific additions beyond Etsy:** carat weight, cut, colour, clarity,
origin country and region, treatment, certification lab / number / URL.

**Deliberately not copied:** Etsy's per-category attribute system (occasion, holiday,
craft type). It exists to serve every craft vertical; a gemstone shop needs the
specific fields above, not a generic attribute bag.

---

## 5. What Trust-Agent has that this project does not

I audited `C:\Users\ronza\Claude\Trust-Agent`. Worth copying, in priority order:

1. **Auth** — custom opaque-token sessions with a SHA-hashed `tokenHash`, bcrypt,
   `revokeAllSessionsForUser`, Google OAuth, TOTP 2FA. `lib/auth-session.ts`,
   `lib/auth-password.ts`, `lib/access.ts`. Proven, and it avoids a NextAuth
   dependency. **Copy this rather than rebuild it.**
2. **RBAC** — role enum plus guard helpers (`requirePageRole`, `requireApiRole`).
   My schema uses `customer | staff | admin | owner`; the guard pattern should be lifted.
3. **Stripe integration + webhook handling** — `lib/stripe.ts`,
   `app/api/webhooks/stripe/route.ts` with signature verification. PayPal would be new.
4. **Email templates** — 28 typed senders in `lib/email-templates.ts`, an
   `EmailTransport` interface over SES + SMTP (the same shape as `src/lib/services/mailer.ts`
   here), a queue, and an admin preview harness at `/admin/email-preview`.
5. **Admin UI patterns** — server-component tables + client `*-manager.tsx`
   components, `admin-search-bar`, row-action dropdowns, image uploader.
6. **API envelope** — `{success, data, meta}` / `{success, error:{code,message,details}}`
   in `lib/api-response.ts`. My API routes are inconsistent by comparison.
7. **Zod validation** centralised in `lib/schemas.ts`. This project has zod installed
   and unused — form and webhook input is currently hand-validated.
8. **Presigned S3 uploads** with a local-disk fallback — a more complete version of
   the storage adapter here.
9. **Background jobs** — BullMQ + Redis. Needed for sheet sync and email retry.
10. **Testing** — `node --test` suites under `tests/`. **This project has no tests at all.**

Also notable: Trust-Agent bans inline styles and hex literals via ESLint
`no-restricted-syntax`, pointing at `docs/STYLE.md`. That is a good pattern and I have
mirrored the intent in `docs/CODE-STANDARDS.md`.

---

## 6. Built this session

- **Taxonomy is now data.** `data/taxonomy.json` defines the categories you specified;
  the normaliser, nav, shop filters and footer all read from it. Adding a category is
  a data edit, and the file's shape matches the `categories` table so the migration is
  a copy rather than a rewrite.
- **Nav is generated from live stock** — categories with zero stock are hidden instead
  of linking to an empty shelf, and each shows real counts per stone type.
- **Product tiles now carry the comparison set** — weight, cut, colour, origin,
  treatment, price per carat, certification badge, and a "1 of 1" marker. Previously
  a tile showed only title, price and two chips, which forced a click for every
  candidate.
- **Postgres schema** (`db/migrations/001_init.sql`) — designed, not executed.

### One decision you need to make

Your spec lists **Raw Gemstones** and **Rough Gemstones** as separate categories.
In the trade these are usually synonyms, and nothing in the Etsy inventory
distinguishes them — `raw-gemstones` currently resolves to zero products, with all
four uncut items landing in `rough-gemstones`.

Two workable readings:
- **Raw** = natural crystals sold whole for collectors; **Rough** = cutting material
  sold by yield. That is the split I encoded in the taxonomy descriptions.
- Or they are one category and one should be removed.

Either is fine, but the listings need tagging accordingly — the parser cannot infer
the difference from an Etsy title.

---

## 7. Suggested build order

Sequenced by dependency, not by visibility.

1. **Stand up Postgres and run the migration.** Everything below needs it. Needs
   Docker on the target machine — I could not do this here.
2. **Auth** — port Trust-Agent's session code. Blocks admin, orders and account pages.
3. **Admin shell + category CRUD** — makes the taxonomy self-service, as asked.
4. **Product CRUD + image upload** — replaces the JSON catalogue as the source of truth.
5. **Cart → checkout → Stripe** — the first path that takes money. PayPal after.
6. **Order emails and invoice PDF** — confirmation, invoice, shipping notice.
7. **Shipping and export docs** — commercial invoice, packing list, certificate of
   origin, per origin country.
8. **Google Sheet import** — after product CRUD exists, since it writes through the
   same validation.
9. **Analytics + attribution**, then the **admin SEO section**.

Items 1–6 are the minimum for a shop that can actually sell. Everything currently
built sits above that line, not on it.
