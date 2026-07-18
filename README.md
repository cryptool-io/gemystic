# Gemystic Marketplace

An independent storefront for Gemystic Gems, built to replace the shop's dependency on
Etsy. All 147 live listings were imported from
[the Etsy shop](https://www.etsy.com/shop/GemysticGemsStudio), parsed into structured
gemmological data, and rebuilt as a search- and AI-optimised marketplace.

Branding, currency, taxonomy and policies mirror the existing shop at
**gemysticgems.com** — USD pricing, free shipping over $500, 30-day returns, the same
category structure and IBM Plex typeface. The visual system is an emerald palette on
light surfaces, defined as semantic tokens in `tailwind.config.ts`.

> **Read [`SECURITY-gemysticgems.com.md`](./SECURITY-gemysticgems.com.md) first.** The
> live WordPress site is compromised and serving SEO spam. That is unrelated to this
> codebase but needs handling before any migration.

```bash
npm install
cp .env.example .env.local     # add ANTHROPIC_API_KEY for the AI features
npm run normalize              # rebuild data/catalog.json from source data
npm run dev                    # http://localhost:3100

# or self-host the whole thing:
docker compose up -d --build
```

Runs entirely on our own hardware with no cloud account. AWS is opt-in per
capability and deferred by design — see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

The site is fully functional without an API key. The three AI surfaces degrade to a
clear explanatory message; every price, margin and pricing flag is computed locally
and is accurate either way.

## What's here

**Storefront** — 147 statically-generated product pages, faceted shop with keyword
search, per-species collection pages, birthstone calendar, buying guides, contact page
and four policy pages.

**SEO** — every product page prerendered with schema.org `Product` markup carrying the
full gemmological attribute set (hardness, RI, SG, crystal system, formula, treatment,
origin), plus `FAQPage`, `Article`, `BreadcrumbList` and `ItemList` where they apply.
Adaptive meta descriptions that end on a complete sentence, unique slugs and titles,
generated sitemap and robots.

**AEO (answer-engine optimisation)** — the part most stores skip. Answer engines are
explicitly welcomed in `robots.ts`, `/llms.txt` states the facts an assistant needs to
get right about the shop, and `/api/catalog` publishes the whole inventory as JSON so
assistants quote live prices instead of stale scraped text.

**AI assistant** — a customer-facing advisor that calls real catalogue tools before it
recommends or prices anything, so it cannot invent stock. Surfaces product cards for
the stones it actually discusses.

**Auto-listing** — photo and/or rough notes in, complete listing out: title,
description, meta tags, 13 Etsy tags, and a price anchored to comparable stones already
in this catalogue rather than a generic market rate. Everything it inferred rather than
knew comes back in a `warnings` field to check before publishing.

**Finance** — inventory valuation, margin by species, Etsy-versus-direct channel
economics on a real fee model, rule-based repricing flags, landed-cost estimates by
destination, and an analyst that interprets those computed figures without inventing
new ones.

**Portable infrastructure** — a driver layer (`src/lib/services/`) means email,
media storage and backups each run locally or on AWS depending on one env var, with
no code change. The AWS SDKs are not dependencies; they load at runtime only if a
cloud driver is selected. `/studio/system` shows which capabilities are where, and
`/api/health` returns 503 rather than 200 when the catalogue or config is broken.

**Responsive** — verified from 320px to 3440px. The product grid is sized by card
width rather than breakpoints, so it never produces 200px cards on a 4K monitor or
one lonely column on a phone; filters collapse behind a toggle below `lg` so stock
is visible immediately on mobile; wide tables scroll in their own container so the
page body never does.

## Structure

```
data/
  etsy-raw.txt        scraped source, one listing per line
  species.json        gemmological knowledge base — drives SEO copy and the AI layer
  catalog.json        generated; do not edit by hand
scripts/normalize.mjs parses Etsy titles into structured attributes
src/lib/
  catalog.ts          querying, faceting, relevance search, related products
  seo.ts              JSON-LD builders
  finance.ts          fee model, margins, pricing flags, landed cost
  ai.ts               Anthropic client with graceful degradation
src/app/
  gem/[slug]          product pages (SSG)
  collections/        by species, plus the birthstone calendar
  learn/              buying guides (SSG)
  policies/[slug]     shipping, returns, privacy, terms
  contact/            contact page + working enquiry form
  media/[...key]      serves local uploads (bypassed when on S3)
src/lib/
  config.ts           typed env, driver selection, validation
  services/           mailer + storage adapters (local | smtp | ses | s3)
scripts/
  backup.mjs          local archive, optional S3 push
  restore.mjs         verified byte-identical round-trip
  studio/             internal: overview, auto-listing, finance
  api/                chat, autolist, finance, catalog
```

## The data problem

An Etsy title is the only structured data the export gives you. Everything the site
needs — species, variety, weight, cut, colour, origin, treatment — has to be recovered
from that one string, and the traps are real:

- *"Emerald Cut Rhodolite Garnet"* is a garnet. Cut names shadow species names
  throughout the catalogue, so cut vocabulary is stripped before species detection.
- Loose-stone titles are full of *"for Rings, Pendants"* keyword bait. A finished piece
  of jewellery always names its metal and a loose stone never does, so metal adjacency —
  not the word "ring" — is what separates them. This reproduces Etsy's own category
  counts exactly (18 rings, 1 pendant).
- Etsy titles contain `|` characters, so the export is parsed from both ends rather
  than split naively.

Re-run `npm run normalize` after touching `data/etsy-raw.txt` or `data/species.json`.

## Notes and next steps

- **Checkout is a stub.** `AddToBag` persists to localStorage; wiring Stripe in is a
  drop-in replacement for that handler.
- **Cost basis is assumed at 42% of retail.** Every margin figure inherits that
  assumption and is labelled as an estimate. Entering real per-stone costs in the
  overrides map is the single highest-value improvement to the finance module.
- **Images are hotlinked from Etsy's CDN.** Fine for an MVP, but they should be moved
  to owned storage before this handles real traffic.
- **Prices are converted from EUR at a stored rate** (1.17, in `scripts/normalize.mjs`).
  The Etsy export arrived in EUR via a Netherlands locale; the shop trades in USD.
  Re-run `npm run normalize` when the rate drifts, or enter USD prices at source.
- **Tanzanite and apatite** have categories on gemysticgems.com but no stock in the
  Etsy export, so they do not appear here.
- **Migration redirects are not written.** If you point the domain at this build, map
  the old `/product-category/...` URLs to `/collections/...` with 301s first.
- Fee rates in `finance.ts` are the published figures at time of writing and belong in
  editable settings rather than in code.
- **Local backups sit on the same disk as the data.** Fine against accidental
  deletion, useless against hardware failure. This is the one reason to bring the
  AWS phase forward rather than defer it — see ARCHITECTURE.md phase 3.
