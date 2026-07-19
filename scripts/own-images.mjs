/**
 * Downloads every hotlinked product photo into our own storage.
 *
 *   node scripts/own-images.mjs            # report what would be fetched
 *   node scripts/own-images.mjs --apply    # download and rewrite the URLs
 *
 * Why this matters more than it looks: every product image currently loads from
 * i.etsystatic.com or gemysticgems.com. The Etsy CDN serves images for listings
 * we no longer control, and the WordPress site is compromised and will be either
 * cleaned or taken down. On the day either happens, the shop loses its
 * photographs, which for a one-of-a-kind gemstone shop means losing the product.
 *
 * Writes to var/uploads (or S3 when STORAGE_DRIVER=s3) through the same storage
 * adapter the rest of the app uses, then rewrites:
 *   - data/catalog.json      image + imageLarge per product
 *   - data/galleries.json    every gallery URL
 *   - product_images rows    the DB inventory photos
 *
 * Re-running is safe: a file already downloaded is skipped, and rewritten URLs
 * are already local so they are not fetched again.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const APPLY = process.argv.includes('--apply');
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './var/uploads';
const CONCURRENCY = 4;

/** Stable key from the source URL, so a re-run maps to the same file. */
function keyFor(url) {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 16);
  const ext = (url.split('?')[0].match(/\.(jpe?g|png|webp|avif|gif)$/i)?.[1] ?? 'jpg').toLowerCase();
  return `products/${hash}.${ext === 'jpeg' ? 'jpg' : ext}`;
}

const isRemote = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);

async function download(url) {
  const res = await fetch(url, {
    headers: {
      // Etsy's CDN refuses obvious bots; a normal UA is enough for public images.
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
      accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new Error(`suspiciously small (${buf.length} bytes)`);
  return buf;
}

// ── Collect every remote URL the site depends on ──────────────────────────────
const catalog = JSON.parse(await readFile('data/catalog.json', 'utf8'));

let galleries = {};
try {
  galleries = JSON.parse(await readFile('data/galleries.json', 'utf8'));
} catch {
  galleries = {};
}

const urls = new Set();
for (const p of catalog.products) {
  if (isRemote(p.image)) urls.add(p.image);
  if (isRemote(p.imageLarge)) urls.add(p.imageLarge);
}
for (const list of Object.values(galleries)) {
  for (const u of list) if (isRemote(u)) urls.add(u);
}

// DB inventory photos, when a database is configured.
let prisma = null;
let dbImages = [];
if (process.env.DATABASE_URL) {
  const { PrismaClient } = await import('@prisma/client');
  prisma = new PrismaClient();
  dbImages = await prisma.productImage.findMany({ select: { id: true, url: true } });
  for (const img of dbImages) if (isRemote(img.url)) urls.add(img.url);
}

const byHost = new Map();
for (const u of urls) {
  const host = new URL(u).hostname;
  byHost.set(host, (byHost.get(host) ?? 0) + 1);
}

console.log(`Remote images referenced: ${urls.size}`);
for (const [host, n] of [...byHost.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${host}: ${n}`);
}
console.log(`  (catalogue products: ${catalog.products.length}, galleries: ${Object.keys(galleries).length}, db images: ${dbImages.length})`);

if (!APPLY) {
  console.log('\nReport only. Re-run with --apply to download these and rewrite the URLs.');
  if (prisma) await prisma.$disconnect();
  process.exit(0);
}

// ── Download ──────────────────────────────────────────────────────────────────
const mapping = new Map();
const failures = [];
const list = [...urls];
let done = 0;

async function worker() {
  while (list.length > 0) {
    const url = list.pop();
    if (!url) break;
    const key = keyFor(url);
    const path = join(UPLOAD_DIR, key);

    if (existsSync(path)) {
      mapping.set(url, `/media/${key}`);
      done++;
      continue;
    }

    try {
      const buf = await download(url);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, buf);
      mapping.set(url, `/media/${key}`);
    } catch (err) {
      failures.push({ url, reason: err instanceof Error ? err.message : String(err) });
    }
    done++;
    if (done % 25 === 0) console.log(`  ${done}/${urls.size}…`);
  }
}

console.log('\nDownloading…');
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`Downloaded or already present: ${mapping.size}. Failed: ${failures.length}.`);

if (failures.length > 0) {
  console.log('Failures (left pointing at their original URL):');
  for (const f of failures.slice(0, 10)) console.log(`  ${f.reason}  ${f.url}`);
}

// ── Rewrite references ────────────────────────────────────────────────────────
let rewrittenProducts = 0;
for (const p of catalog.products) {
  const a = mapping.get(p.image);
  const b = mapping.get(p.imageLarge);
  if (a) p.image = a;
  if (b) p.imageLarge = b;
  if (a || b) rewrittenProducts++;
}

let rewrittenGallery = 0;
for (const [slug, listUrls] of Object.entries(galleries)) {
  galleries[slug] = listUrls.map((u) => {
    const local = mapping.get(u);
    if (local) rewrittenGallery++;
    return local ?? u;
  });
}

await writeFile('data/catalog.json', `${JSON.stringify(catalog, null, 1)}\n`, 'utf8');
await writeFile('data/galleries.json', `${JSON.stringify(galleries, null, 1)}\n`, 'utf8');

let rewrittenDb = 0;
if (prisma) {
  for (const img of dbImages) {
    const local = mapping.get(img.url);
    if (!local) continue;
    await prisma.productImage.update({ where: { id: img.id }, data: { url: local } });
    rewrittenDb++;
  }
  await prisma.$disconnect();
}

console.log(
  `\nRewritten: ${rewrittenProducts} catalogue products, ${rewrittenGallery} gallery images, ${rewrittenDb} database images.`,
);
console.log('Files live in var/uploads and are served from /media. Commit data/*.json.');
if (failures.length > 0) {
  console.log('Re-run to retry the failures; anything still failing keeps its original URL.');
}
