# Architecture

The guiding constraint: **the whole system must run on our own hardware, and each
capability must be movable to AWS independently, without touching application code.**

AWS is the last step, not the foundation. Everything works before any AWS account
exists — and if the account went away tomorrow, the shop would keep trading.

## How that is enforced

Application code never talks to a cloud SDK. It talks to an interface:

```
src/lib/config.ts            typed env, driver selection, validation
src/lib/services/mailer.ts   Mailer   -> file | smtp | ses
src/lib/services/storage.ts  Storage  -> local | s3
scripts/backup.mjs           backup   -> local | s3
```

The contact form calls `mailer().send(...)`. Whether that writes an `.eml` to disk,
hands off to an SMTP relay, or calls SES is a matter of `MAIL_DRIVER` in the
environment. The handler is byte-identical in all three cases.

The AWS SDKs are **not dependencies**. They are loaded at runtime through
`optionalRequire`, so a self-hosted install never downloads them, and the project
typechecks and builds without them. Ask for a driver whose package is missing and
you get a precise error naming the package and the install command — not a crash.

## Phases

### Phase 1 — fully local (this is where the code is now)

| Capability | Driver | Where it lives |
|---|---|---|
| Web app | Next.js standalone | our box |
| Catalogue | `data/catalog.json` | our box |
| Email | `file` | `var/outbox/*.eml` |
| Media | `local` | `var/uploads`, served via `/media` |
| Backups | `local` | `var/backups`, 30-day retention |

```bash
docker compose up -d --build
```

One container, one volume, no external accounts. The AI features need an Anthropic
key; nothing else does.

**Known gap:** local backups sit on the same machine as the data they protect. That
is fine for accidental deletion and useless for a disk failure or theft. It is the
single reason to bring AWS forward rather than defer it.

### Phase 2 — AWS SES for outbound mail

The first thing worth moving, because self-hosting outbound mail means managing SPF,
DKIM, DMARC and IP reputation — and mail from a residential or small-VPS IP largely
lands in spam. Deliverability is the one problem money genuinely solves.

```env
MAIL_DRIVER=ses
AWS_REGION=eu-west-1
MAIL_FROM=Gemystic Gems <no-reply@gemysticgems.com>
```

```bash
npm install @aws-sdk/client-sesv2
```

Before switching: verify the domain in SES, publish the DKIM records, and request
production access — new accounts are sandboxed and can only send to verified
addresses. Budget a day for the review.

An SMTP relay (`MAIL_DRIVER=smtp`) is a valid alternative and keeps AWS out of the
picture entirely; SES's own SMTP endpoint also works through that driver.

### Phase 3 — S3 for offsite backups

The disaster-recovery step, and the highest-value AWS use for this business.

```env
BACKUP_DRIVER=s3
BACKUP_S3_BUCKET=gemystic-backups
AWS_REGION=eu-west-1
```

```bash
npm install @aws-sdk/client-s3
npm run backup
```

Bucket configuration that matters more than the code: **versioning on**, **public
access blocked**, **Object Lock in governance mode** so ransomware cannot delete
history, and a lifecycle rule to Glacier after 90 days. Archives go up as
`STANDARD_IA` — read once a year at most.

### Phase 4 — S3 for media (only if needed)

```env
STORAGE_DRIVER=s3
S3_BUCKET=gemystic-media
S3_PUBLIC_BASE_URL=https://cdn.gemysticgems.com
```

Deferred deliberately. With 147 one-off stones and modest traffic, local disk plus a
CDN in front is cheaper and simpler. This becomes worthwhile at multi-node hosting
or when image volume outgrows the box — not before.

## What is deliberately NOT on the roadmap

- **RDS / managed Postgres.** 147 products in a JSON file, statically generated at
  build time, is faster than any database round trip and has no operational cost.
  Revisit when there is real order volume and inventory mutates at runtime.
- **Lambda / serverless.** The workload is a long-lived server with warm caches. A
  cold start per request would make it slower and harder to reason about.
- **ECS / EKS.** One container does not need an orchestrator.

Each of these is a real option later. None earns its complexity today.

## Operational surface

| Task | Command |
|---|---|
| Rebuild catalogue | `npm run normalize` |
| Backup | `npm run backup` |
| Restore | `npm run restore -- var/backups/<file>.json.gz` |
| Dry-run restore | `npm run restore -- <file> --dry-run` |
| Typecheck | `npm run typecheck` |
| Health probe | `GET /api/health` |
| Live config view | `/studio/system` |

`/api/health` returns 503 rather than 200 when the catalogue fails to load or config
validation finds an error. A process that is up but serving an empty shop is not
healthy, and a green check that hides that is worse than no check.

Backups are verified by round-trip, not assumed: `restore.mjs` was run against a real
archive and `data/catalog.json` came back byte-identical.

## Configuration reference

See `.env.example`. Rules that matter:

- Prefer an **instance role** over static access keys. The adapters use the default
  AWS credential chain and never read keys from our own config, so a role just works.
- `NEXT_PUBLIC_SITE_URL` must be set in production — canonical URLs, the sitemap,
  JSON-LD and `llms.txt` all derive from it. Config validation raises an error if it
  still points at localhost.
- `MAIL_DRIVER=file` in production raises a warning: enquiries would be written to
  disk and never delivered.
