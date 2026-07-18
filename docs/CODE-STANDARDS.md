# Code standards

Rules a reviewer can point at. Where this project and Trust-Agent differ without a
reason, prefer Trust-Agent's convention, one house style across both codebases is
worth more than a marginally better rule in one of them.

---

## Naming

| Thing | Convention | Example |
|---|---|---|
| React components | `PascalCase`, one per file, file named after it | `ProductCard.tsx` |
| Hooks | `useCamelCase` | `useCart.ts` |
| Non-component modules | `kebab-case.ts` | `order-totals.ts` |
| Functions and variables | `camelCase` | `pricingFlags()` |
| Types and interfaces | `PascalCase`, no `I` prefix | `Product`, not `IProduct` |
| Constants | `SCREAMING_SNAKE` for true constants only | `DEFAULT_COST_RATIO` |
| DB tables | `snake_case`, plural | `order_items` |
| DB columns | `snake_case` | `carat_weight` |
| URL paths | `kebab-case` | `/collections/rough-gemstones` |
| Env vars | `SCREAMING_SNAKE`, prefixed by area | `BACKUP_S3_BUCKET` |
| Booleans | read as a predicate | `isActive`, `hasApiKey`, `certified` |

**Money is never a float.** `NUMERIC(12,2)` in Postgres, integer minor units or a
decimal library in application code. Binary floating point cannot represent `0.10`.

**Dates are `TIMESTAMPTZ`, always stored UTC**, formatted at the edge.

---

## Colour

Never write a hex literal in a component. Every colour comes from a semantic token
in `tailwind.config.ts`:

| Token | Use for | Never for |
|---|---|---|
| `canvas` | page background | cards |
| `surface` | cards, panels, sticky header | page background |
| `surface-2` | subtle fills, table stripes, image placeholders | text |
| `line` / `line-strong` | borders, dividers | text |
| `fg` | primary text | backgrounds |
| `muted` | secondary text, labels | primary text |
| `subtle` | tertiary and decorative text | anything load-bearing |
| `brand` | identity, links, primary actions, **positive** values | warnings |
| `brand-dark` | hover and active on brand | resting state |
| `brand-tint` | brand-tinted fills, hover backgrounds | large areas of text |
| `accent` | **warnings**, certification badges, attention | success, primary actions |

Two rules that carry real meaning and are easy to break:

1. **Brand green means positive, accent amber means caution.** "Underpriced" is
   `brand`; "overpriced" is `accent`. A sweep once flattened both to `brand` and the
   finance page silently lost its meaning, the numbers were right and the page lied.
2. **Never encode information in colour alone.** Every coloured state also carries a
   label or a sign (`+12%`, "underpriced"), for colour-blind users and greyscale print.

---

## Buttons

Three variants, no more. Defined in `globals.css`, never restyled inline.

| Class | Use | Rule |
|---|---|---|
| `.btn-primary` | the single main action on a view | **at most one per screen region** |
| `.btn-ghost` | secondary actions, filters, cancel | any number |
| plain link | tertiary / navigational | no button chrome |

- Every button has a visible focus ring, `.btn` includes `focus-visible:ring-2`.
  Do not remove it.
- Minimum touch target 44×44 px on touch devices; `.btn` padding satisfies this.
- Disabled buttons use `disabled:opacity-40` **and** the `disabled` attribute, so
  they are non-interactive for keyboard and screen readers, not just faded.
- Destructive actions require confirmation and must not be `.btn-primary`.
- Button label is a verb: "Add to bag", "Generate listing", not "OK", not "Submit".

## Forms

- Every input uses `.field` and has a real `<label>` with `htmlFor`. Placeholder is
  never a substitute for a label.
- Validate on the server always; client validation is a convenience, not a control.
- Errors appear next to the field, in `accent`, with text, never colour alone.
- Honeypot plus rate limiting on any public form (see `api/contact/route.ts`).

## Tables

- Always inside `.scroll-x`, with `min-w-[Nrem]` on the table. Wide content scrolls
  in its own container; **the page body must never scroll horizontally**.
- Numeric columns right-aligned, text columns left-aligned.
- Header row is `text-muted` and `font-normal`, weight is for data, not chrome.
- Rows separated with `divide-y divide-line`, not borders on every cell.
- Any table that can exceed ~50 rows needs pagination or virtualisation before ship.

---

## Layout and responsiveness

- Page content is wrapped in `.wrap`. Do not set page gutters anywhere else.
- Product grids use `.grid-products`, which sizes by **card width** (`auto-fill` +
  `minmax`), not by breakpoint. Breakpoint-counted columns produce 200px cards on a
  4K monitor and one column on a phone.
- Verify every new view at **320px, 375px, 768px, 1440px and 2560px**. The checks
  that matter: no horizontal page scroll, no text under 12px, no tap target under
  44px, and no important control below the fold on a phone.
- Never `maximum-scale=1` or `user-scalable=no`. Customers zoom into gemstone photos.

---

## React and Next

- **Server components by default.** Add `'use client'` only for state, effects,
  browser APIs or event handlers, and push it to the leaf, not the page.
- A client component that needs server data takes it as props. Do not fetch in a
  client component when the parent can pass it.
- `useSearchParams` requires a `<Suspense>` boundary or the whole route opts out of
  static rendering.
- Prefer `<Link>` to `router.push`. Prefer a real `<form action>` so things work
  before hydration.
- `next/image` for every image, with an `alt` that describes the stone rather than
  repeating the title.

## API routes

Return a consistent envelope (Trust-Agent's `lib/api-response.ts` is the reference):

```ts
{ success: true,  data, meta? }
{ success: false, error: { code, message, details? } }
```

- Validate input with zod. It is already a dependency and currently unused.
- Never leak internals in an error message. Log the detail, return the cause.
- Any handler with side effects is rate-limited and idempotent, a retried webhook
  must not create a second payment.

## Comments

Explain **why**, never what. A comment restating the code is noise; a comment
explaining a non-obvious constraint is the most valuable line in the file.

```ts
// Good, explains a constraint the code cannot state
// Addresses are COPIED, not referenced: if a customer edits their address in 2027
// the 2026 invoice must still show where the parcel actually went.

// Bad, restates the code
// Loop over the products
```

---

## Definition of done

Before a change is considered finished:

1. `npm run typecheck` passes.
2. `npm run build` passes with **no new warnings**.
3. The change was exercised in a browser at mobile and desktop widths, not just
   compiled.
4. No hex colours, no inline `style={{}}`, no `any` without a comment justifying it.
5. New user-facing copy states what is actually true. If email is not delivered, the
   UI says so rather than showing "Sent".

**Never run `next build` while `next dev` is running.** They share `.next` and
corrupt each other, this produced two spurious failures during development.

## Known gaps in this repo

Recorded so they are decisions rather than oversights:

- **No tests.** Trust-Agent uses `node --test` under `tests/`; this project has none.
  Order totals, pricing flags and the Etsy title parser are the first things that
  deserve them.
- **No ESLint rule enforcing the colour and inline-style bans above.** Trust-Agent
  enforces them via `no-restricted-syntax`; copy that config.
- **API routes do not use the envelope** described above, and none validate with zod.
