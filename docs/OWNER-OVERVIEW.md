# Owner overview: where Gemystic Gems stands

Written for you, not for developers. One page on what exists, what it needs from
you, and what gets built next. Technical detail lives in docs/NEXT-SESSION.md.

## What is live and working today

**The shop.** All 147 Etsy listings imported and rebuilt as a fast catalogue:
category menus generated from live stock, full filtering (stone, price, carat,
colour, cut, origin), search, buying guides for every species, birthstone pages,
customer reviews (your real Etsy reviews seeded, with moderation), a working cart
with discount codes and correct totals, and a "Just listed" moving showcase.
Emerald-on-light design, your logo, Sora typeface, payment brand icons, one
Support button combining the AI gemologist and human contact.

**Selling machinery.** Multi-currency (USD, EUR, PKR) detected from the visitor
and switchable; discount campaigns and promo codes with free-shipping option,
managed in admin; SOLD banners with an admin-set display window; a real
"this stone is in someone's cart" signal; Etsy sold-sync with a watch mode.

**Admin.** Role-based team management (you are owner), catalogue viewer, reviews
moderation, discounts, Etsy sync, market price comparison against researched
retail ranges, SEO status, system health. First account to register becomes
owner, that is you locally already.

**Foundations.** PostgreSQL schema for the whole business (orders, payments,
shipping, export documents, analytics) written and validated, one command from
running. Infra runs fully on your own hardware with AWS as opt-in switches.
Everything is on GitHub: github.com/cryptool-io/gemystic.

**Strategy documents produced by expert agents.** SEO-STRATEGY (128 keywords,
honest difficulty, 13-week plan), CONVERSION-REVIEW (trust and PR plan, top fixes
already implemented), market-prices data, PLATFORM-AUDIT, CODE-STANDARDS,
REQUEST-TRACKER (every request you made, graded).

## What is NOT live yet, in plain words

You cannot yet take an online payment. Cart hands off to WhatsApp concierge
ordering (deliberately framed that way per the conversion review). Orders,
invoices, shipping paperwork and the Google-Sheet importer are all designed in
the database schema but waiting on the database actually running. The three AI
features (assistant, auto-lister, finance analyst) are built end-to-end but have
never run, because no AI key has ever been configured.

## The 12 things only you can do

1. ~~Database~~ **Done for you**: you already run PostgreSQL natively for
   Trust-Agent, so the gemystic database was created on it and all 24 tables
   migrated. No Docker anywhere, matching how you host everything else.
2. **Pick an AI provider** and put its key in `.env.local`: free route =
   Groq/OpenRouter (AI_OPENAI_*), backup = AWS Bedrock, direct = Anthropic.
3. **Create a GA4 property** and set NEXT_PUBLIC_GA_ID.
4. **Apply for an Etsy developer app** if you want truly instant cross-channel
   sold updates; until approved, run `npm run etsy:sync -- --watch 10`.
5. **Clean the hacked WordPress site** (gemysticgems.com serves gambling spam;
   see the SECURITY file kept off GitHub). Must happen before the domain moves.
6. **Open Stripe and PayPal accounts** and share API keys for checkout.
7. **Choose where to host** (the Docker container runs anywhere) and give the
   final domain so canonical URLs and sitemap are correct.
8. **Enter real stone costs** so profit numbers stop being 42% estimates.
9. **Tag Thailand-shipped stock**, everything currently says Pakistan.
10. **Approve or reject the Sora font** (third candidate, one-line swap if not).
11. **Decide on LAUNCH15** (the demo 15% + free-shipping code) and set FX-rate
    update cadence.
12. **Shoot short daylight videos** of stones over $300, the conversion review's
    highest-impact trust builder that code cannot do.

## Build order from here (each is roughly a session or two)

1. Database live + accounts on it + password reset
2. **Checkout: Stripe then PayPal, orders, confirmation emails, PDF invoices**
3. Shipping + export documents (Pakistan and Thailand)
4. Google-Sheet listing importer
5. First-party analytics dashboards ("where do buyers come from")
6. Full admin self-service (add categories, products and photos without code)
7. SEO gap pages from the strategy (Swat hub, price guides, comparisons)
8. Hardening: tests, validation, production rate limiting

Milestone 2 is the moment the platform earns money on its own. Everything before
it exists to make that safe; everything after it makes it grow.

## Honest positioning

For a cold visitor today the shop looks real, informative and trustworthy, and
it can take an order through the concierge path. Its weakest points are the ones
no code fixes: 4 reviews, no videos, a brand nobody knows yet. The conversion
review and SEO strategy are the playbooks for exactly that, and both are written
to be executed by you starting this week.
